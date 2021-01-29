package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
	"github.com/pkg/sftp"
	"github.com/sirupsen/logrus"
	"golang.org/x/crypto/ssh"
	"net/http"
	"next-terminal/pkg/model"
	"next-terminal/pkg/utils"
	"strconv"
	"sync"
	"time"
)

var UpGrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
	Subprotocols: []string{"guacamole"},
}

type NextWriter struct {
	b  bytes.Buffer
	mu sync.Mutex
}

func (w *NextWriter) Write(p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.b.Write(p)
}

func (w *NextWriter) Read() ([]byte, int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	p := w.b.Bytes()
	buf := make([]byte, len(p))
	read, err := w.b.Read(buf)
	w.b.Reset()
	if err != nil {
		return nil, 0, err
	}
	return buf, read, err
}

const (
	Connected = "connected"
	Data      = "data"
	Resize    = "resize"
	Closed    = "closed"
)

type Message struct {
	Type    string `json:"type"`
	Content string `json:"content"`
}

type WindowSize struct {
	Cols int `json:"cols"`
	Rows int `json:"rows"`
}

func SSHEndpoint(c echo.Context) error {
	ws, err := UpGrader.Upgrade(c.Response().Writer, c.Request(), nil)
	if err != nil {
		logrus.Errorf("升级为WebSocket协议失败：%v", err.Error())
		return err
	}

	assetId := c.QueryParam("assetId")
	width, _ := strconv.Atoi(c.QueryParam("width"))
	height, _ := strconv.Atoi(c.QueryParam("height"))

	user, _ := GetCurrentAccount(c)
	if model.TypeUser == user.Type {
		// 检测是否有访问权限
		assetIds, err := model.FindAssetIdsByUserId(user.ID)
		if err != nil {
			return err
		}

		if !utils.Contains(assetIds, assetId) {
			return errors.New("您没有权限访问此资产")
		}
	}

	sshClient, err := CreateSshClient(assetId)
	if err != nil {
		logrus.Errorf("创建SSH客户端失败：%v", err.Error())
		msg := Message{
			Type:    Closed,
			Content: err.Error(),
		}
		err := WriteMessage(ws, msg)
		return err
	}

	session, err := sshClient.NewSession()
	if err != nil {
		logrus.Errorf("创建SSH会话失败：%v", err.Error())
		msg := Message{
			Type:    Closed,
			Content: err.Error(),
		}
		err := WriteMessage(ws, msg)
		return err
	}
	defer session.Close()

	modes := ssh.TerminalModes{
		ssh.ECHO:          1,
		ssh.TTY_OP_ISPEED: 14400,
		ssh.TTY_OP_OSPEED: 14400,
	}

	if err := session.RequestPty("xterm", height, width, modes); err != nil {
		return err
	}

	var b NextWriter
	session.Stdout = &b
	session.Stderr = &b

	stdinPipe, err := session.StdinPipe()
	if err != nil {
		return err
	}

	if err := session.Shell(); err != nil {
		return err
	}

	msg := Message{
		Type:    Connected,
		Content: "Connect to server successfully.\r\n",
	}
	_ = WriteMessage(ws, msg)

	recorder, err := NewRecorder("./" + assetId + ".cast")
	if err != nil {
		return err
	}

	header := &Header{
		Title:     "test",
		Version:   2,
		Height:    height,
		Width:     width,
		Env:       Env{Shell: "/bin/bash", Term: "xterm-256color"},
		Timestamp: int(time.Now().Unix()),
	}

	if err := recorder.WriteHeader(header); err != nil {
		return err
	}

	var mut sync.Mutex
	var active = true

	go func() {
		for true {
			mut.Lock()
			if !active {
				logrus.Debugf("会话: %v -> %v 关闭", sshClient.LocalAddr().String(), sshClient.RemoteAddr().String())
				recorder.Close()
				break
			}
			mut.Unlock()

			p, n, err := b.Read()
			if err != nil {
				continue
			}
			if n > 0 {
				s := string(p)
				msg := Message{
					Type:    Data,
					Content: s,
				}
				// 录屏
				_ = recorder.WriteData(s)

				message, err := json.Marshal(msg)
				if err != nil {
					logrus.Warnf("生成Json失败 %v", err)
					continue
				}
				WriteByteMessage(ws, message)
			}
			time.Sleep(time.Duration(100) * time.Millisecond)
		}
	}()

	for true {
		_, message, err := ws.ReadMessage()
		if err != nil {
			// web socket会话关闭后主动关闭ssh会话
			_ = session.Close()
			mut.Lock()
			active = false
			mut.Unlock()
			break
		}

		var msg Message
		err = json.Unmarshal(message, &msg)
		if err != nil {
			logrus.Warnf("解析Json失败: %v, 原始字符串：%v", err, string(message))
			continue
		}

		switch msg.Type {
		case Resize:
			var winSize WindowSize
			err = json.Unmarshal([]byte(msg.Content), &winSize)
			if err != nil {
				logrus.Warnf("解析SSH会话窗口大小失败: %v", err)
				continue
			}
			if err := session.WindowChange(winSize.Rows, winSize.Cols); err != nil {
				logrus.Warnf("更改SSH会话窗口大小失败: %v", err)
				continue
			}
		case Data:
			_, err = stdinPipe.Write([]byte(msg.Content))
			if err != nil {
				logrus.Debugf("SSH会话写入失败: %v", err)
			}
		}

	}
	return err
}

func WriteMessage(ws *websocket.Conn, msg Message) error {
	message, err := json.Marshal(msg)
	if err != nil {
		logrus.Warnf("生成Json失败 %v", err)
	}
	WriteByteMessage(ws, message)
	return err
}

func CreateSshClient(assetId string) (*ssh.Client, error) {
	asset, err := model.FindAssetById(assetId)
	if err != nil {
		return nil, err
	}

	var (
		accountType = asset.AccountType
		username    = asset.Username
		password    = asset.Password
		privateKey  = asset.PrivateKey
		passphrase  = asset.Passphrase
	)

	var authMethod ssh.AuthMethod
	if accountType == "credential" {

		credential, err := model.FindCredentialById(asset.CredentialId)
		if err != nil {
			return nil, err
		}
		accountType = credential.Type
		username = credential.Username
		password = credential.Password
		privateKey = credential.PrivateKey
		passphrase = credential.Passphrase
	}

	if username == "-" {
		username = ""
	}
	if password == "-" {
		password = ""
	}
	if privateKey == "-" {
		privateKey = ""
	}
	if passphrase == "-" {
		passphrase = ""
	}

	if accountType == model.PrivateKey {
		var key ssh.Signer
		if len(passphrase) > 0 {
			key, err = ssh.ParsePrivateKeyWithPassphrase([]byte(privateKey), []byte(passphrase))
			if err != nil {
				return nil, err
			}
		} else {
			key, err = ssh.ParsePrivateKey([]byte(privateKey))
			if err != nil {
				return nil, err
			}
		}
		authMethod = ssh.PublicKeys(key)
	} else {
		authMethod = ssh.Password(password)
	}

	config := &ssh.ClientConfig{
		Timeout:         1 * time.Second,
		User:            username,
		Auth:            []ssh.AuthMethod{authMethod},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
	}

	addr := fmt.Sprintf("%s:%d", asset.IP, asset.Port)

	sshClient, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		return nil, err
	}
	return sshClient, nil
}

func WriteByteMessage(ws *websocket.Conn, p []byte) {
	err := ws.WriteMessage(websocket.TextMessage, p)
	if err != nil {
		logrus.Debugf("write: %v", err)
	}
}

func CreateSftpClient(assetId string) (sftpClient *sftp.Client, err error) {
	sshClient, err := CreateSshClient(assetId)
	if err != nil {
		return nil, err
	}

	return sftp.NewClient(sshClient)
}
