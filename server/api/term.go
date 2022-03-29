package api

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"path"
	"strconv"

	"next-terminal/server/config"
	"next-terminal/server/constant"
	"next-terminal/server/dto"
	"next-terminal/server/global/session"
	"next-terminal/server/guacd"
	"next-terminal/server/log"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/service"
	"next-terminal/server/term"
	"next-terminal/server/utils"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
)

const (
	Closed    = 0
	Connected = 1
	Data      = 2
	Resize    = 3
	Ping      = 4
)

type WebTerminalApi struct {
}

func (api WebTerminalApi) SshEndpoint(c echo.Context) error {
	ws, err := UpGrader.Upgrade(c.Response().Writer, c.Request(), nil)
	if err != nil {
		log.Errorf("升级为WebSocket协议失败：%v", err.Error())
		return err
	}

	defer func() {
		_ = ws.Close()
	}()
	ctx := context.TODO()

	sessionId := c.Param("id")
	cols, _ := strconv.Atoi(c.QueryParam("cols"))
	rows, _ := strconv.Atoi(c.QueryParam("rows"))

	s, err := service.SessionService.FindByIdAndDecrypt(ctx, sessionId)
	if err != nil {
		return WriteMessage(ws, dto.NewMessage(Closed, "获取会话失败"))
	}

	if err := api.permissionCheck(c, s.AssetId); err != nil {
		return WriteMessage(ws, dto.NewMessage(Closed, err.Error()))
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
		g, err := service.GatewayService.GetGatewayAndReconnectById(s.AccessGatewayId)
		if err != nil {
			return WriteMessage(ws, dto.NewMessage(Closed, "获取接入网关失败："+err.Error()))
		}
		if !g.Connected {
			return WriteMessage(ws, dto.NewMessage(Closed, "接入网关不可用："+g.Message))
		}
		exposedIP, exposedPort, err := g.OpenSshTunnel(s.ID, ip, port)
		if err != nil {
			return WriteMessage(ws, dto.NewMessage(Closed, "创建隧道失败："+err.Error()))
		}
		defer g.CloseSshTunnel(s.ID)
		ip = exposedIP
		port = exposedPort
	}

	recording := ""
	var isRecording = false
	property, err := repository.PropertyRepository.FindByName(ctx, guacd.EnableRecording)
	if err == nil && property.Value == "true" {
		isRecording = true
	}

	if isRecording {
		recording = path.Join(config.GlobalCfg.Guacd.Recording, sessionId, "recording.cast")
	}

	attributes, err := repository.AssetRepository.FindAssetAttrMapByAssetId(ctx, s.AssetId)
	if err != nil {
		return WriteMessage(ws, dto.NewMessage(Closed, "获取资产属性失败："+err.Error()))
	}

	var xterm = "xterm-256color"
	var nextTerminal *term.NextTerminal
	if "true" == attributes[constant.SocksProxyEnable] {
		nextTerminal, err = term.NewNextTerminalUseSocks(ip, port, username, password, privateKey, passphrase, rows, cols, recording, xterm, true, attributes[constant.SocksProxyHost], attributes[constant.SocksProxyPort], attributes[constant.SocksProxyUsername], attributes[constant.SocksProxyPassword])
	} else {
		nextTerminal, err = term.NewNextTerminal(ip, port, username, password, privateKey, passphrase, rows, cols, recording, xterm, true)
	}

	if err != nil {
		return WriteMessage(ws, dto.NewMessage(Closed, "创建SSH客户端失败："+err.Error()))
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
	if err := repository.SessionRepository.UpdateById(ctx, &sess, sessionId); err != nil {
		return err
	}

	if err := WriteMessage(ws, dto.NewMessage(Connected, "")); err != nil {
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
	go nextSession.Observer.Start()
	session.GlobalSessionManager.Add <- nextSession

	termHandler := NewTermHandler(sessionId, isRecording, ws, nextTerminal)
	termHandler.Start()
	defer termHandler.Stop()

	for {
		_, message, err := ws.ReadMessage()
		if err != nil {
			// web socket会话关闭后主动关闭ssh会话
			log.Debugf("WebSocket已关闭")
			service.SessionService.CloseSessionById(sessionId, Normal, "用户正常退出")
			break
		}

		msg, err := dto.ParseMessage(string(message))
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
			var winSize dto.WindowSize
			err = json.Unmarshal(decodeString, &winSize)
			if err != nil {
				log.Warnf("解析SSH会话窗口大小失败: %v，原始字符串：%v", err, msg.Content)
				continue
			}
			if err := nextTerminal.WindowChange(winSize.Rows, winSize.Cols); err != nil {
				log.Warnf("更改SSH会话窗口大小失败: %v", err)
			}
			_ = repository.SessionRepository.UpdateWindowSizeById(ctx, winSize.Rows, winSize.Cols, sessionId)
		case Data:
			input := []byte(msg.Content)
			_, err := nextTerminal.Write(input)
			if err != nil {
				service.SessionService.CloseSessionById(sessionId, TunnelClosed, "远程连接已关闭")
			}
		case Ping:
			_, _, err := nextTerminal.SshClient.Conn.SendRequest("helloworld1024@foxmail.com", true, nil)
			if err != nil {
				service.SessionService.CloseSessionById(sessionId, TunnelClosed, "远程连接已关闭")
			} else {
				_ = WriteMessage(ws, dto.NewMessage(Ping, ""))
			}

		}
	}
	return err
}

func (api WebTerminalApi) SshMonitorEndpoint(c echo.Context) error {
	ws, err := UpGrader.Upgrade(c.Response().Writer, c.Request(), nil)
	if err != nil {
		log.Errorf("升级为WebSocket协议失败：%v", err.Error())
		return err
	}

	defer func() {
		_ = ws.Close()
	}()
	ctx := context.TODO()

	sessionId := c.Param("id")
	s, err := repository.SessionRepository.FindById(ctx, sessionId)
	if err != nil {
		return WriteMessage(ws, dto.NewMessage(Closed, "获取会话失败"))
	}

	nextSession := session.GlobalSessionManager.GetById(sessionId)
	if nextSession == nil {
		return WriteMessage(ws, dto.NewMessage(Closed, "会话已离线"))
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

func (api WebTerminalApi) permissionCheck(c echo.Context, assetId string) error {
	user, _ := GetCurrentAccount(c)
	if constant.TypeUser == user.Type {
		// 检测是否有访问权限
		assetIds, err := repository.ResourceSharerRepository.FindAssetIdsByUserId(context.TODO(), user.ID)
		if err != nil {
			return err
		}

		if !utils.Contains(assetIds, assetId) {
			return errors.New("您没有权限访问此资产")
		}
	}
	return nil
}

func WriteMessage(ws *websocket.Conn, msg dto.Message) error {
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
