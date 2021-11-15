package api

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"path"
	"strconv"
	"time"
	"unicode/utf8"

	"next-terminal/server/config"
	"next-terminal/server/constant"
	"next-terminal/server/global/session"
	"next-terminal/server/guacd"
	"next-terminal/server/log"
	"next-terminal/server/model"
	"next-terminal/server/term"
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
	Closed    = 0
	Connected = 1
	Data      = 2
	Resize    = 3
	Ping      = 4
)

type Message struct {
	Type    int    `json:"type"`
	Content string `json:"content"`
}

func (r Message) ToString() string {
	if r.Content != "" {
		return strconv.Itoa(r.Type) + r.Content
	} else {
		return strconv.Itoa(r.Type)
	}
}

func NewMessage(_type int, content string) Message {
	return Message{Content: content, Type: _type}
}

func ParseMessage(value string) (message Message, err error) {
	if value == "" {
		return
	}

	_type, err := strconv.Atoi(value[:1])
	if err != nil {
		return
	}
	var content = value[1:]
	message = NewMessage(_type, content)
	return
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

	defer ws.Close()

	sessionId := c.QueryParam("sessionId")
	cols, _ := strconv.Atoi(c.QueryParam("cols"))
	rows, _ := strconv.Atoi(c.QueryParam("rows"))

	s, err := sessionRepository.FindByIdAndDecrypt(sessionId)
	if err != nil {
		return WriteMessage(ws, NewMessage(Closed, "获取会话失败"))
	}

	if err := permissionCheck(c, s.AssetId); err != nil {
		return WriteMessage(ws, NewMessage(Closed, err.Error()))
	}

	var (
		username   = s.Username
		password   = s.Password
		privateKey = s.PrivateKey
		passphrase = s.Passphrase
		ip         = s.IP
		port       = s.Port
	)

	if s.AccessGatewayId != "" && s.AccessGatewayId != "-" {
		g, err := accessGatewayService.GetGatewayAndReconnectById(s.AccessGatewayId)
		if err != nil {
			return WriteMessage(ws, NewMessage(Closed, "获取接入网关失败："+err.Error()))
		}
		if !g.Connected {
			return WriteMessage(ws, NewMessage(Closed, "接入网关不可用："+g.Message))
		}
		exposedIP, exposedPort, err := g.OpenSshTunnel(s.ID, ip, port)
		if err != nil {
			return WriteMessage(ws, NewMessage(Closed, "创建隧道失败："+err.Error()))
		}
		defer g.CloseSshTunnel(s.ID)
		ip = exposedIP
		port = exposedPort
	}

	recording := ""
	var isRecording = false
	property, err := propertyRepository.FindByName(guacd.EnableRecording)
	if err == nil && property.Value == "true" {
		isRecording = true
	}

	if isRecording {
		recording = path.Join(config.GlobalCfg.Guacd.Recording, sessionId, "recording.cast")
	}

	attributes, err := assetRepository.FindAssetAttrMapByAssetId(s.AssetId)
	if err != nil {
		return WriteMessage(ws, NewMessage(Closed, "获取资产属性失败："+err.Error()))
	}

	var xterm = "xterm-256color"
	var nextTerminal *term.NextTerminal
	if "true" == attributes[constant.SocksProxyEnable] {
		nextTerminal, err = term.NewNextTerminalUseSocks(ip, port, username, password, privateKey, passphrase, rows, cols, recording, xterm, true, attributes[constant.SocksProxyHost], attributes[constant.SocksProxyPort], attributes[constant.SocksProxyUsername], attributes[constant.SocksProxyPassword])
	} else {
		nextTerminal, err = term.NewNextTerminal(ip, port, username, password, privateKey, passphrase, rows, cols, recording, xterm, true)
	}

	if err != nil {
		return WriteMessage(ws, NewMessage(Closed, "创建SSH客户端失败："+err.Error()))
	}

	if err := nextTerminal.RequestPty(xterm, rows, cols); err != nil {
		return err
	}

	if err := nextTerminal.Shell(); err != nil {
		return err
	}

	sess := model.Session{
		ConnectionId: sessionId,
		Width:        cols,
		Height:       rows,
		Status:       constant.Connecting,
		Recording:    recording,
	}
	if sess.Recording == "" {
		// 未录屏时无需审计
		sess.Reviewed = true
	}
	// 创建新会话
	log.Debugf("创建新会话 %v", sess.ConnectionId)
	if err := sessionRepository.UpdateById(&sess, sessionId); err != nil {
		return err
	}

	if err := WriteMessage(ws, NewMessage(Connected, "")); err != nil {
		return err
	}

	nextSession := &session.Session{
		ID:           s.ID,
		Protocol:     s.Protocol,
		Mode:         s.Mode,
		WebSocket:    ws,
		GuacdTunnel:  nil,
		NextTerminal: nextTerminal,
		Observer:     session.NewObserver(s.ID),
	}
	go nextSession.Observer.Run()
	session.GlobalSessionManager.Add <- nextSession

	ctx, cancel := context.WithCancel(context.Background())
	tick := time.NewTicker(time.Millisecond * time.Duration(60))
	defer tick.Stop()

	var buf []byte
	dataChan := make(chan rune)

	go func() {
	SshLoop:
		for {
			select {
			case <-ctx.Done():
				log.Debugf("WebSocket已关闭，即将关闭SSH连接...")
				break SshLoop
			default:
				r, size, err := nextTerminal.StdoutReader.ReadRune()
				if err != nil {
					log.Debugf("SSH 读取失败，即将退出循环...")
					_ = WriteMessage(ws, NewMessage(Closed, ""))
					break SshLoop
				}
				if size > 0 {
					dataChan <- r
				}
			}
		}
		log.Debugf("SSH 连接已关闭，退出循环。")
	}()

	go func() {
	tickLoop:
		for {
			select {
			case <-ctx.Done():
				break tickLoop
			case <-tick.C:
				if len(buf) > 0 {
					s := string(buf)
					// 录屏
					if isRecording {
						_ = nextTerminal.Recorder.WriteData(s)
					}
					// 监控
					if len(nextSession.Observer.All()) > 0 {
						obs := nextSession.Observer.All()
						for _, ob := range obs {
							_ = WriteMessage(ob.WebSocket, NewMessage(Data, s))
						}
					}
					if err := WriteMessage(ws, NewMessage(Data, s)); err != nil {
						log.Debugf("WebSocket写入失败，即将退出循环...")
						cancel()
					}
					buf = []byte{}
				}
			case data := <-dataChan:
				if data != utf8.RuneError {
					p := make([]byte, utf8.RuneLen(data))
					utf8.EncodeRune(p, data)
					buf = append(buf, p...)
				} else {
					buf = append(buf, []byte("@")...)
				}
			}
		}
		log.Debugf("SSH 连接已关闭，退出定时器循环。")
	}()

	//var enterKeys []rune
	//enterIndex := 0
	for {
		_, message, err := ws.ReadMessage()
		if err != nil {
			// web socket会话关闭后主动关闭ssh会话
			log.Debugf("WebSocket已关闭")
			CloseSessionById(sessionId, Normal, "用户正常退出")
			cancel()
			break
		}

		msg, err := ParseMessage(string(message))
		if err != nil {
			log.Warnf("消息解码失败: %v, 原始字符串：%v", err, string(message))
			continue
		}

		switch msg.Type {
		case Resize:
			decodeString, err := base64.StdEncoding.DecodeString(msg.Content)
			if err != nil {
				log.Warnf("Base64解码失败: %v，原始字符串：%v", err, msg.Content)
				continue
			}
			var winSize WindowSize
			err = json.Unmarshal(decodeString, &winSize)
			if err != nil {
				log.Warnf("解析SSH会话窗口大小失败: %v，原始字符串：%v", err, msg.Content)
				continue
			}
			if err := nextTerminal.WindowChange(winSize.Rows, winSize.Cols); err != nil {
				log.Warnf("更改SSH会话窗口大小失败: %v", err)
			}
			_ = sessionRepository.UpdateWindowSizeById(winSize.Rows, winSize.Cols, sessionId)
		case Data:
			input := []byte(msg.Content)
			//hexInput := hex.EncodeToString(input)
			//switch hexInput {
			//case "0d": // 回车
			//	DealCommand(enterKeys)
			//	// 清空输入的字符
			//	enterKeys = enterKeys[:0]
			//	enterIndex = 0
			//case "7f": // backspace
			//	enterIndex--
			//	if enterIndex < 0 {
			//		enterIndex = 0
			//	}
			//	temp := enterKeys[:enterIndex]
			//	if len(enterKeys) > enterIndex {
			//		enterKeys = append(temp, enterKeys[enterIndex+1:]...)
			//	} else {
			//		enterKeys = temp
			//	}
			//case "1b5b337e": // del
			//	temp := enterKeys[:enterIndex]
			//	if len(enterKeys) > enterIndex {
			//		enterKeys = append(temp, enterKeys[enterIndex+1:]...)
			//	} else {
			//		enterKeys = temp
			//	}
			//	enterIndex--
			//	if enterIndex < 0 {
			//		enterIndex = 0
			//	}
			//case "1b5b41":
			//case "1b5b42":
			//	break
			//case "1b5b43": // ->
			//	enterIndex++
			//	if enterIndex > len(enterKeys) {
			//		enterIndex = len(enterKeys)
			//	}
			//case "1b5b44": // <-
			//	enterIndex--
			//	if enterIndex < 0 {
			//		enterIndex = 0
			//	}
			//default:
			//	enterKeys = utils.InsertSlice(enterIndex, []rune(msg.Content), enterKeys)
			//	enterIndex++
			//}
			_, err := nextTerminal.Write(input)
			if err != nil {
				CloseSessionById(sessionId, TunnelClosed, "远程连接已关闭")
			}
		case Ping:
			_, _, err := nextTerminal.SshClient.Conn.SendRequest("helloworld1024@foxmail.com", true, nil)
			if err != nil {
				CloseSessionById(sessionId, TunnelClosed, "远程连接已关闭")
			} else {
				_ = WriteMessage(ws, NewMessage(Ping, ""))
			}

		}
	}
	return err
}

func permissionCheck(c echo.Context, assetId string) error {
	user, _ := GetCurrentAccount(c)
	if constant.TypeUser == user.Type {
		// 检测是否有访问权限
		assetIds, err := resourceSharerRepository.FindAssetIdsByUserId(user.ID)
		if err != nil {
			return err
		}

		if !utils.Contains(assetIds, assetId) {
			return errors.New("您没有权限访问此资产")
		}
	}
	return nil
}

func WriteMessage(ws *websocket.Conn, msg Message) error {
	message := []byte(msg.ToString())
	return ws.WriteMessage(websocket.TextMessage, message)
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
	return term.NewNextTerminal(ip, port, username, password, privateKey, passphrase, 10, 10, "", "", false)
}

func SshMonitor(c echo.Context) error {
	ws, err := UpGrader.Upgrade(c.Response().Writer, c.Request(), nil)
	if err != nil {
		log.Errorf("升级为WebSocket协议失败：%v", err.Error())
		return err
	}

	defer ws.Close()

	sessionId := c.QueryParam("sessionId")
	s, err := sessionRepository.FindById(sessionId)
	if err != nil {
		return WriteMessage(ws, NewMessage(Closed, "获取会话失败"))
	}

	nextSession := session.GlobalSessionManager.GetById(sessionId)
	if nextSession == nil {
		return WriteMessage(ws, NewMessage(Closed, "会话已离线"))
	}

	obId := utils.UUID()
	obSession := &session.Session{
		ID:        obId,
		Protocol:  s.Protocol,
		Mode:      s.Mode,
		WebSocket: ws,
	}
	nextSession.Observer.Add <- obSession
	log.Debugf("会话 %v 观察者 %v 进入", sessionId, obId)

	for {
		_, _, err := ws.ReadMessage()
		if err != nil {
			log.Debugf("会话 %v 观察者 %v 退出", sessionId, obId)
			nextSession.Observer.Del <- obId
			break
		}
	}
	return nil
}
