package api

import (
	"context"
	"encoding/base64"
	"errors"
	"path"
	"strconv"
	"time"

	"next-terminal/server/config"
	"next-terminal/server/constant"
	"next-terminal/server/global/session"
	"next-terminal/server/guacd"
	"next-terminal/server/log"
	"next-terminal/server/model"
	"next-terminal/server/utils"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
)

const (
	TunnelClosed             int = -1
	Normal                   int = 0
	NotFoundSession          int = 800
	NewTunnelError           int = 801
	ForcedDisconnect         int = 802
	AccessGatewayUnAvailable int = 803
	AccessGatewayCreateError int = 804
	AssetNotActive           int = 805
)

func TunEndpoint(c echo.Context) error {

	ws, err := UpGrader.Upgrade(c.Response().Writer, c.Request(), nil)
	if err != nil {
		log.Errorf("升级为WebSocket协议失败：%v", err.Error())
		return err
	}

	width := c.QueryParam("width")
	height := c.QueryParam("height")
	dpi := c.QueryParam("dpi")
	sessionId := c.QueryParam("sessionId")
	connectionId := c.QueryParam("connectionId")

	intWidth, _ := strconv.Atoi(width)
	intHeight, _ := strconv.Atoi(height)

	configuration := guacd.NewConfiguration()

	propertyMap := propertyRepository.FindAllMap()

	var s model.Session

	if len(connectionId) > 0 {
		s, err = sessionRepository.FindByConnectionId(connectionId)
		if err != nil {
			return err
		}
		if s.Status != constant.Connected {
			return errors.New("会话未在线")
		}
		configuration.ConnectionID = connectionId
		sessionId = s.ID
		configuration.SetParameter("width", strconv.Itoa(s.Width))
		configuration.SetParameter("height", strconv.Itoa(s.Height))
		configuration.SetParameter("dpi", "96")
	} else {
		configuration.SetParameter("width", width)
		configuration.SetParameter("height", height)
		configuration.SetParameter("dpi", dpi)
		s, err = sessionRepository.FindByIdAndDecrypt(sessionId)
		if err != nil {
			return err
		}
		setConfig(propertyMap, s, configuration)
		var (
			ip   = s.IP
			port = s.Port
		)
		if s.AccessGatewayId != "" && s.AccessGatewayId != "-" {
			g, err := accessGatewayService.GetGatewayAndReconnectById(s.AccessGatewayId)
			if err != nil {
				disconnect(ws, AccessGatewayUnAvailable, "获取接入网关失败："+err.Error())
				return nil
			}
			if !g.Connected {
				disconnect(ws, AccessGatewayUnAvailable, "接入网关不可用："+g.Message)
				return nil
			}
			exposedIP, exposedPort, err := g.OpenSshTunnel(s.ID, ip, port)
			if err != nil {
				disconnect(ws, AccessGatewayCreateError, "创建SSH隧道失败："+err.Error())
				return nil
			}
			defer g.CloseSshTunnel(s.ID)
			ip = exposedIP
			port = exposedPort
		}
		active, err := utils.Tcping(ip, port)
		if !active {
			disconnect(ws, AssetNotActive, "目标资产不在线: "+err.Error())
			return nil
		}

		configuration.SetParameter("hostname", ip)
		configuration.SetParameter("port", strconv.Itoa(port))

		// 加载资产配置的属性，优先级比全局配置的高，因此最后加载，覆盖掉全局配置
		attributes, err := assetRepository.FindAssetAttrMapByAssetId(s.AssetId)
		if err != nil {
			return err
		}
		if len(attributes) > 0 {
			setAssetConfig(attributes, s, configuration)
		}
	}
	for name := range configuration.Parameters {
		// 替换数据库空格字符串占位符为真正的空格
		if configuration.Parameters[name] == "-" {
			configuration.Parameters[name] = ""
		}
	}

	addr := config.GlobalCfg.Guacd.Hostname + ":" + strconv.Itoa(config.GlobalCfg.Guacd.Port)
	log.Debugf("[%v:%v] 创建guacd隧道[%v]", sessionId, connectionId, addr)

	guacdTunnel, err := guacd.NewTunnel(addr, configuration)
	if err != nil {
		if connectionId == "" {
			disconnect(ws, NewTunnelError, err.Error())
		}
		log.Printf("[%v:%v] 建立连接失败: %v", sessionId, connectionId, err.Error())
		return err
	}

	nextSession := &session.Session{
		ID:          sessionId,
		Protocol:    s.Protocol,
		Mode:        s.Mode,
		WebSocket:   ws,
		GuacdTunnel: guacdTunnel,
	}

	if len(s.ConnectionId) == 0 {
		if configuration.Protocol == constant.SSH {
			nextTerminal, err := CreateNextTerminalBySession(s)
			if err == nil {
				nextSession.NextTerminal = nextTerminal
			}
		}

		nextSession.Observer = session.NewObserver(sessionId)
		session.GlobalSessionManager.Add <- nextSession
		go nextSession.Observer.Run()
		sess := model.Session{
			ConnectionId: guacdTunnel.UUID,
			Width:        intWidth,
			Height:       intHeight,
			Status:       constant.Connecting,
			Recording:    configuration.GetParameter(guacd.RecordingPath),
		}
		// 创建新会话
		log.Debugf("[%v:%v] 创建新会话: %v", sessionId, connectionId, sess.ConnectionId)
		if err := sessionRepository.UpdateById(&sess, sessionId); err != nil {
			return err
		}
	} else {
		// 要监控会话
		forObsSession := session.GlobalSessionManager.GetById(sessionId)
		if forObsSession == nil {
			disconnect(ws, NotFoundSession, "获取会话失败")
			return nil
		}
		nextSession.ID = utils.UUID()
		forObsSession.Observer.Add <- nextSession
		log.Debugf("[%v:%v] 观察者[%v]加入会话[%v]", sessionId, connectionId, nextSession.ID, s.ConnectionId)
	}

	ctx, cancel := context.WithCancel(context.Background())
	tick := time.NewTicker(time.Millisecond * time.Duration(60))
	defer tick.Stop()
	var buf []byte
	dataChan := make(chan []byte)

	go func() {
	GuacdLoop:
		for {
			select {
			case <-ctx.Done():
				log.Debugf("[%v:%v] WebSocket 已关闭，即将关闭 Guacd 连接...", sessionId, connectionId)
				break GuacdLoop
			default:
				instruction, err := guacdTunnel.Read()
				if err != nil {
					log.Debugf("[%v:%v] Guacd 读取失败，即将退出循环...", sessionId, connectionId)
					disconnect(ws, TunnelClosed, "远程连接已关闭")
					break GuacdLoop
				}
				if len(instruction) == 0 {
					continue
				}
				dataChan <- instruction
			}
		}
		log.Debugf("[%v:%v] Guacd 连接已关闭，退出 Guacd 循环。", sessionId, connectionId)
	}()

	go func() {
	tickLoop:
		for {
			select {
			case <-ctx.Done():
				break tickLoop
			case <-tick.C:
				if len(buf) > 0 {
					err = ws.WriteMessage(websocket.TextMessage, buf)
					if err != nil {
						log.Debugf("[%v:%v] WebSocket写入失败，即将关闭Guacd连接...", sessionId, connectionId)
						break tickLoop
					}
					buf = []byte{}
				}
			case data := <-dataChan:
				buf = append(buf, data...)
			}
		}
		log.Debugf("[%v:%v] Guacd连接已关闭，退出定时器循环。", sessionId, connectionId)
	}()

	for {
		_, message, err := ws.ReadMessage()
		if err != nil {
			log.Debugf("[%v:%v] WebSocket已关闭", sessionId, connectionId)
			// guacdTunnel.Read() 会阻塞，所以要先把guacdTunnel客户端关闭，才能退出Guacd循环
			_ = guacdTunnel.Close()

			if connectionId != "" {
				observerId := nextSession.ID
				forObsSession := session.GlobalSessionManager.GetById(sessionId)
				if forObsSession != nil {
					// 移除会话中保存的观察者信息
					forObsSession.Observer.Del <- observerId
					log.Debugf("[%v:%v] 观察者[%v]退出会话", sessionId, connectionId, observerId)
				}
			} else {
				CloseSessionById(sessionId, Normal, "用户正常退出")
			}
			cancel()
			break
		}
		_, err = guacdTunnel.WriteAndFlush(message)
		if err != nil {
			CloseSessionById(sessionId, TunnelClosed, "远程连接已关闭")
		}
	}
	return nil
}

func setAssetConfig(attributes map[string]string, s model.Session, configuration *guacd.Configuration) {
	for key, value := range attributes {
		if guacd.DrivePath == key {
			// 忽略该参数
			continue
		}
		if guacd.EnableDrive == key && value == "true" {
			storageId := attributes[guacd.DrivePath]
			if storageId == "" || storageId == "-" {
				// 默认空间ID和用户ID相同
				storageId = s.Creator
			}
			realPath := path.Join(storageService.GetBaseDrivePath(), storageId)
			configuration.SetParameter(guacd.EnableDrive, "true")
			configuration.SetParameter(guacd.DriveName, "Next Terminal Filesystem")
			configuration.SetParameter(guacd.DrivePath, realPath)
			log.Debugf("[%v] 会话 %v:%v 映射目录地址为 %v", s.ID, s.IP, s.Port, realPath)
		} else {
			configuration.SetParameter(key, value)
		}
	}
}

func setConfig(propertyMap map[string]string, s model.Session, configuration *guacd.Configuration) {
	if propertyMap[guacd.EnableRecording] == "true" {
		configuration.SetParameter(guacd.RecordingPath, path.Join(config.GlobalCfg.Guacd.Recording, s.ID))
		configuration.SetParameter(guacd.CreateRecordingPath, propertyMap[guacd.CreateRecordingPath])
	} else {
		configuration.SetParameter(guacd.RecordingPath, "")
	}

	configuration.Protocol = s.Protocol
	switch configuration.Protocol {
	case "rdp":
		configuration.SetParameter("username", s.Username)
		configuration.SetParameter("password", s.Password)

		configuration.SetParameter("security", "any")
		configuration.SetParameter("ignore-cert", "true")
		configuration.SetParameter("create-drive-path", "true")
		configuration.SetParameter("resize-method", "reconnect")
		configuration.SetParameter(guacd.EnableWallpaper, propertyMap[guacd.EnableWallpaper])
		configuration.SetParameter(guacd.EnableTheming, propertyMap[guacd.EnableTheming])
		configuration.SetParameter(guacd.EnableFontSmoothing, propertyMap[guacd.EnableFontSmoothing])
		configuration.SetParameter(guacd.EnableFullWindowDrag, propertyMap[guacd.EnableFullWindowDrag])
		configuration.SetParameter(guacd.EnableDesktopComposition, propertyMap[guacd.EnableDesktopComposition])
		configuration.SetParameter(guacd.EnableMenuAnimations, propertyMap[guacd.EnableMenuAnimations])
		configuration.SetParameter(guacd.DisableBitmapCaching, propertyMap[guacd.DisableBitmapCaching])
		configuration.SetParameter(guacd.DisableOffscreenCaching, propertyMap[guacd.DisableOffscreenCaching])
		configuration.SetParameter(guacd.DisableGlyphCaching, propertyMap[guacd.DisableGlyphCaching])
	case "ssh":
		if len(s.PrivateKey) > 0 && s.PrivateKey != "-" {
			configuration.SetParameter("username", s.Username)
			configuration.SetParameter("private-key", s.PrivateKey)
			configuration.SetParameter("passphrase", s.Passphrase)
		} else {
			configuration.SetParameter("username", s.Username)
			configuration.SetParameter("password", s.Password)
		}

		configuration.SetParameter(guacd.FontSize, propertyMap[guacd.FontSize])
		configuration.SetParameter(guacd.FontName, propertyMap[guacd.FontName])
		configuration.SetParameter(guacd.ColorScheme, propertyMap[guacd.ColorScheme])
		configuration.SetParameter(guacd.Backspace, propertyMap[guacd.Backspace])
		configuration.SetParameter(guacd.TerminalType, propertyMap[guacd.TerminalType])
	case "vnc":
		configuration.SetParameter("username", s.Username)
		configuration.SetParameter("password", s.Password)
	case "telnet":
		configuration.SetParameter("username", s.Username)
		configuration.SetParameter("password", s.Password)

		configuration.SetParameter(guacd.FontSize, propertyMap[guacd.FontSize])
		configuration.SetParameter(guacd.FontName, propertyMap[guacd.FontName])
		configuration.SetParameter(guacd.ColorScheme, propertyMap[guacd.ColorScheme])
		configuration.SetParameter(guacd.Backspace, propertyMap[guacd.Backspace])
		configuration.SetParameter(guacd.TerminalType, propertyMap[guacd.TerminalType])
	case "kubernetes":
		configuration.SetParameter(guacd.FontSize, propertyMap[guacd.FontSize])
		configuration.SetParameter(guacd.FontName, propertyMap[guacd.FontName])
		configuration.SetParameter(guacd.ColorScheme, propertyMap[guacd.ColorScheme])
		configuration.SetParameter(guacd.Backspace, propertyMap[guacd.Backspace])
		configuration.SetParameter(guacd.TerminalType, propertyMap[guacd.TerminalType])
	default:

	}
}

func disconnect(ws *websocket.Conn, code int, reason string) {
	// guacd 无法处理中文字符，所以进行了base64编码。
	encodeReason := base64.StdEncoding.EncodeToString([]byte(reason))
	err := guacd.NewInstruction("error", encodeReason, strconv.Itoa(code))
	_ = ws.WriteMessage(websocket.TextMessage, []byte(err.String()))
	disconnect := guacd.NewInstruction("disconnect")
	_ = ws.WriteMessage(websocket.TextMessage, []byte(disconnect.String()))
}
