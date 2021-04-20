package api

import (
	"encoding/json"
	"net/http"
	"path"
	"strconv"
	"time"

	"next-terminal/pkg/constant"
	"next-terminal/pkg/global"
	"next-terminal/pkg/guacd"
	"next-terminal/pkg/log"
	"next-terminal/pkg/term"
	"next-terminal/server/model"
	"next-terminal/server/utils"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
)

var UpGrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
	Subprotocols: []string{"guacamole"},
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

func SSHEndpoint(c echo.Context) (err error) {
	ws, err := UpGrader.Upgrade(c.Response().Writer, c.Request(), nil)
	if err != nil {
		log.Errorf("升级为WebSocket协议失败：%v", err.Error())
		return err
	}

	sessionId := c.QueryParam("sessionId")
	cols, _ := strconv.Atoi(c.QueryParam("cols"))
	rows, _ := strconv.Atoi(c.QueryParam("rows"))

	session, err := sessionRepository.FindByIdAndDecrypt(sessionId)
	if err != nil {
		msg := Message{
			Type:    Closed,
			Content: "get sshSession error." + err.Error(),
		}
		_ = WriteMessage(ws, msg)
		return err
	}

	user, _ := GetCurrentAccount(c)
	if constant.TypeUser == user.Type {
		// 检测是否有访问权限
		assetIds, err := resourceSharerRepository.FindAssetIdsByUserId(user.ID)
		if err != nil {
			return err
		}

		if !utils.Contains(assetIds, session.AssetId) {
			msg := Message{
				Type:    Closed,
				Content: "您没有权限访问此资产",
			}
			return WriteMessage(ws, msg)
		}
	}

	var (
		username   = session.Username
		password   = session.Password
		privateKey = session.PrivateKey
		passphrase = session.Passphrase
		ip         = session.IP
		port       = session.Port
	)

	recording := ""
	propertyMap := propertyRepository.FindAllMap()
	if propertyMap[guacd.EnableRecording] == "true" {
		recording = path.Join(propertyMap[guacd.RecordingPath], sessionId, "recording.cast")
	}

	tun := global.Tun{
		Protocol:  session.Protocol,
		Mode:      session.Mode,
		WebSocket: ws,
	}

	if session.ConnectionId != "" {
		// 监控会话
		observable, ok := global.Store.Get(sessionId)
		if ok {
			observers := append(observable.Observers, tun)
			observable.Observers = observers
			global.Store.Set(sessionId, observable)
			log.Debugf("加入会话%v,当前观察者数量为：%v", session.ConnectionId, len(observers))
		}

		return err
	}

	nextTerminal, err := term.NewNextTerminal(ip, port, username, password, privateKey, passphrase, rows, cols, recording)

	if err != nil {
		log.Errorf("创建SSH客户端失败：%v", err.Error())
		msg := Message{
			Type:    Closed,
			Content: err.Error(),
		}
		err := WriteMessage(ws, msg)
		return err
	}
	tun.NextTerminal = nextTerminal

	var observers []global.Tun
	observable := global.Observable{
		Subject:   &tun,
		Observers: observers,
	}

	global.Store.Set(sessionId, &observable)

	sess := model.Session{
		ConnectionId: sessionId,
		Width:        cols,
		Height:       rows,
		Status:       constant.Connecting,
		Recording:    recording,
	}
	// 创建新会话
	log.Debugf("创建新会话 %v", sess.ConnectionId)
	if err := sessionRepository.UpdateById(&sess, sessionId); err != nil {
		return err
	}

	msg := Message{
		Type:    Connected,
		Content: "",
	}
	_ = WriteMessage(ws, msg)

	quitChan := make(chan bool)

	go ReadMessage(nextTerminal, quitChan, ws)

	for {
		_, message, err := ws.ReadMessage()
		if err != nil {
			// web socket会话关闭后主动关闭ssh会话
			CloseSessionById(sessionId, Normal, "正常退出")
			quitChan <- true
			quitChan <- true
			break
		}

		var msg Message
		err = json.Unmarshal(message, &msg)
		if err != nil {
			log.Warnf("解析Json失败: %v, 原始字符串：%v", err, string(message))
			continue
		}

		switch msg.Type {
		case Resize:
			var winSize WindowSize
			err = json.Unmarshal([]byte(msg.Content), &winSize)
			if err != nil {
				log.Warnf("解析SSH会话窗口大小失败: %v", err)
				continue
			}
			if err := nextTerminal.WindowChange(winSize.Rows, winSize.Cols); err != nil {
				log.Warnf("更改SSH会话窗口大小失败: %v", err)
				continue
			}
		case Data:
			_, err = nextTerminal.Write([]byte(msg.Content))
			if err != nil {
				log.Debugf("SSH会话写入失败: %v", err)
				msg := Message{
					Type:    Closed,
					Content: "the remote connection is closed.",
				}
				_ = WriteMessage(ws, msg)
			}
		}

	}
	return err
}

func ReadMessage(nextTerminal *term.NextTerminal, quitChan chan bool, ws *websocket.Conn) {

	var quit bool
	for {
		select {
		case quit = <-quitChan:
			if quit {
				return
			}
		default:
			p, n, err := nextTerminal.Read()
			if err != nil {
				msg := Message{
					Type:    Closed,
					Content: err.Error(),
				}
				_ = WriteMessage(ws, msg)
			}
			if n > 0 {
				s := string(p)
				msg := Message{
					Type:    Data,
					Content: s,
				}
				_ = WriteMessage(ws, msg)
			}
			time.Sleep(time.Duration(10) * time.Millisecond)
		}
	}
}

func WriteMessage(ws *websocket.Conn, msg Message) error {
	message, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	WriteByteMessage(ws, message)
	return err
}

func WriteByteMessage(ws *websocket.Conn, p []byte) {
	err := ws.WriteMessage(websocket.TextMessage, p)
	if err != nil {
		log.Debugf("write: %v", err)
	}
}

func CreateNextTerminalBySession(session model.Session) (*term.NextTerminal, error) {
	var (
		username   = session.Username
		password   = session.Password
		privateKey = session.PrivateKey
		passphrase = session.Passphrase
		ip         = session.IP
		port       = session.Port
	)
	return term.NewNextTerminal(ip, port, username, password, privateKey, passphrase, 10, 10, "")
}
