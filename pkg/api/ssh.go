package api

import (
	"bytes"
	"fmt"
	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
	"github.com/pkg/sftp"
	"github.com/sirupsen/logrus"
	"golang.org/x/crypto/ssh"
	"net/http"
	"next-terminal/pkg/model"
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

func SSHEndpoint(c echo.Context) error {
	ws, err := UpGrader.Upgrade(c.Response().Writer, c.Request(), nil)
	if err != nil {
		logrus.Errorf("升级为WebSocket协议失败：%v", err.Error())
		return err
	}

	assetId := c.QueryParam("assetId")
	width, _ := strconv.Atoi(c.QueryParam("width"))
	height, _ := strconv.Atoi(c.QueryParam("height"))

	sshClient, err := CreateSshClient(assetId)
	if err != nil {
		logrus.Errorf("创建SSH客户端失败：%v", err.Error())
		return err
	}

	session, err := sshClient.NewSession()
	if err != nil {
		logrus.Errorf("创建SSH会话失败：%v", err.Error())
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

	go func() {

		for true {
			p, n, err := b.Read()
			if err != nil {
				continue
			}
			if n > 0 {
				WriteByteMessage(ws, p)
			}
			time.Sleep(time.Duration(100) * time.Millisecond)
		}
	}()

	for true {
		_, message, err := ws.ReadMessage()
		if err != nil {
			continue
		}
		_, err = stdinPipe.Write(message)
		if err != nil {
			logrus.Debugf("Tunnel write: %v", err)
		}
	}
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

func WriteMessage(ws *websocket.Conn, message string) {
	WriteByteMessage(ws, []byte(message))
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
