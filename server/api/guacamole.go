package api

import (
	"context"
	"fmt"
	"net/http"
	"next-terminal/server/common/guacamole"
	"next-terminal/server/common/nt"
	"path"
	"strconv"
	"time"

	"next-terminal/server/config"
	"next-terminal/server/global/session"
	"next-terminal/server/log"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/service"
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
	NewSshClientError        int = 806
)

var UpGrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
	Subprotocols: []string{"guacamole"},
}

type GuacamoleApi struct {
}

func (api GuacamoleApi) Guacamole(c echo.Context) error {
	ws, err := UpGrader.Upgrade(c.Response().Writer, c.Request(), nil)
	if err != nil {
		log.Warn("升级为WebSocket协议失败", log.NamedError("err", err))
		return err
	}
	defer ws.Close()

	ctx := context.TODO()
	width := c.QueryParam("width")
	height := c.QueryParam("height")
	dpi := c.QueryParam("dpi")
	sessionId := c.Param("id")

	intWidth, _ := strconv.Atoi(width)
	intHeight, _ := strconv.Atoi(height)

	configuration := guacamole.NewConfiguration()

	propertyMap := repository.PropertyRepository.FindAllMap(ctx)

	configuration.SetParameter("width", width)
	configuration.SetParameter("height", height)
	configuration.SetParameter("dpi", dpi)
	s, err := service.SessionService.FindByIdAndDecrypt(ctx, sessionId)
	if err != nil {
		return err
	}
	api.setConfig(propertyMap, s, configuration)

	if s.AccessGatewayId != "" && s.AccessGatewayId != "-" {
		g, err := service.GatewayService.GetGatewayById(s.AccessGatewayId)
		if err != nil {
			guacamole.Disconnect(ws, AccessGatewayUnAvailable, "获取接入网关失败："+err.Error())
			return nil
		}

		if g.GatewayType == "rdp" {
			configuration.SetParameter("gateway-hostname", g.IP)
			configuration.SetParameter("gateway-port", strconv.Itoa(g.Port))
			configuration.SetParameter("gateway-username", s.Username)
			configuration.SetParameter("gateway-password", s.Password)
		} else {
			defer g.CloseSshTunnel(s.ID)
			exposedIP, exposedPort, err := g.OpenSshTunnel(s.ID, s.IP, s.Port)
			if err != nil {
				guacamole.Disconnect(ws, AccessGatewayCreateError, "创建SSH隧道失败："+err.Error())
				return nil
			}
			s.IP = exposedIP
			s.Port = exposedPort
		}
	}

	configuration.SetParameter("hostname", s.IP)
	configuration.SetParameter("port", strconv.Itoa(s.Port))

	// 加载资产配置的属性，优先级比全局配置的高，因此最后加载，覆盖掉全局配置
	attributes, err := repository.AssetRepository.FindAssetAttrMapByAssetId(ctx, s.AssetId)
	if err != nil {
		return err
	}
	if len(attributes) > 0 {
		api.setAssetConfig(attributes, s, configuration)
	}
	for name := range configuration.Parameters {
		// 替换数据库空格字符串占位符为真正的空格
		if configuration.Parameters[name] == "-" {
			configuration.Parameters[name] = ""
		}
	}

	addr := config.GlobalCfg.Guacd.Hostname + ":" + strconv.Itoa(config.GlobalCfg.Guacd.Port)
	asset := fmt.Sprintf("%s:%s", configuration.GetParameter("hostname"), configuration.GetParameter("port"))
	log.Debug("新建 guacd 会话", log.String("sessionId", sessionId), log.String("addr", addr), log.String("asset", asset))

	guacdTunnel, err := guacamole.NewTunnel(addr, configuration)
	if err != nil {
		guacamole.Disconnect(ws, NewTunnelError, err.Error())
		log.Error("建立连接失败", log.String("sessionId", sessionId), log.NamedError("err", err))
		return err
	}

	nextSession := &session.Session{
		ID:          sessionId,
		Protocol:    s.Protocol,
		Mode:        s.Mode,
		WebSocket:   ws,
		GuacdTunnel: guacdTunnel,
	}

	if configuration.Protocol == nt.SSH {
		nextTerminal, err := CreateNextTerminalBySession(s)
		if err != nil {
			guacamole.Disconnect(ws, NewSshClientError, "建立SSH客户端失败: "+err.Error())
			log.Debug("建立 ssh 客户端失败", log.String("sessionId", sessionId), log.NamedError("err", err))
			return err
		}
		nextSession.NextTerminal = nextTerminal
	}

	nextSession.Observer = session.NewObserver(sessionId)
	session.GlobalSessionManager.Add(nextSession)
	sess := model.Session{
		ConnectionId: guacdTunnel.UUID,
		Width:        intWidth,
		Height:       intHeight,
		Status:       nt.Connecting,
		Recording:    configuration.GetParameter(guacamole.RecordingPath),
	}
	if sess.Recording == "" {
		// 未录屏时无需审计
		sess.Reviewed = true
	}
	// 创建新会话
	log.Debug("新建会话成功", log.String("sessionId", sessionId))
	if err := repository.SessionRepository.UpdateById(ctx, &sess, sessionId); err != nil {
		return err
	}

	guacamoleHandler := NewGuacamoleHandler(ws, guacdTunnel)
	guacamoleHandler.Start()
	defer guacamoleHandler.Stop()

	// WebSocket Ping/Pong handler to keep connection alive
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				if err := ws.WriteMessage(websocket.PingMessage, nil); err != nil {
					log.Debug("WebSocket Ping failed", log.String("sessionId", sessionId), log.NamedError("err", err))
					_ = ws.Close()
					return
				}
			}
		}
	}()

	for {
		ws.SetReadDeadline(time.Now().Add(60 * time.Second))
		_, message, err := ws.ReadMessage()
		if err != nil {
			log.Debug("WebSocket已关闭", log.String("sessionId", sessionId), log.NamedError("err", err))
			// guacdTunnel.Read() 会阻塞，所以要先把guacdTunnel客户端关闭，才能退出Guacd循环
			_ = guacdTunnel.Close()

			service.SessionService.CloseSessionById(sessionId, Normal, "用户正常退出")
			return nil
		}
		_, err = guacdTunnel.WriteAndFlush(message)
		if err != nil {
			service.SessionService.CloseSessionById(sessionId, TunnelClosed, "远程连接已关闭")
			return nil
		}
	}
}

func (api GuacamoleApi) setAssetConfig(attributes map[string]string, s model.Session, configuration *guacamole.Configuration) {
	for key, value := range attributes {
		if guacamole.DrivePath == key {
			// 忽略该参数
			continue
		}
		if guacamole.EnableDrive == key && value == "true" {
			storageId := attributes[guacamole.DrivePath]
			if storageId == "" || storageId == "-" {
				// 默认空间ID和用户ID相同
				storageId = s.Creator
			}
			realPath := path.Join(service.StorageService.GetBaseDrivePath(), storageId)
			configuration.SetParameter(guacamole.EnableDrive, "true")
			configuration.SetParameter(guacamole.DriveName, "Filesystem")
			configuration.SetParameter(guacamole.DrivePath, realPath)
		} else {
			configuration.SetParameter(key, value)
		}
	}
}

func (api GuacamoleApi) GuacamoleMonitor(c echo.Context) error {
	ws, err := UpGrader.Upgrade(c.Response().Writer, c.Request(), nil)
	if err != nil {
		log.Warn("升级为WebSocket协议失败", log.NamedError("err", err))
		return err
	}
	ctx := context.TODO()
	sessionId := c.Param("id")

	s, err := repository.SessionRepository.FindById(ctx, sessionId)
	if err != nil {
		return err
	}
	if s.Status != nt.Connected {
		guacamole.Disconnect(ws, AssetNotActive, "会话离线")
		return nil
	}
	connectionId := s.ConnectionId
	configuration := guacamole.NewConfiguration()
	configuration.ConnectionID = connectionId
	sessionId = s.ID
	configuration.SetParameter("width", strconv.Itoa(s.Width))
	configuration.SetParameter("height", strconv.Itoa(s.Height))
	configuration.SetParameter("dpi", "96")
	configuration.SetReadOnlyMode()

	addr := config.GlobalCfg.Guacd.Hostname + ":" + strconv.Itoa(config.GlobalCfg.Guacd.Port)

	guacdTunnel, err := guacamole.NewTunnel(addr, configuration)
	if err != nil {
		guacamole.Disconnect(ws, NewTunnelError, err.Error())
		return err
	}

	nextSession := &session.Session{
		ID:          sessionId,
		Protocol:    s.Protocol,
		Mode:        s.Mode,
		WebSocket:   ws,
		GuacdTunnel: guacdTunnel,
	}

	// 要监控会话
	forObsSession := session.GlobalSessionManager.GetById(sessionId)
	if forObsSession == nil {
		guacamole.Disconnect(ws, NotFoundSession, "获取会话失败")
		return nil
	}
	nextSession.ID = utils.UUID()
	forObsSession.Observer.Add(nextSession)

	guacamoleHandler := NewGuacamoleHandler(ws, guacdTunnel)
	guacamoleHandler.Start()
	defer guacamoleHandler.Stop()

	for {
		_, message, err := ws.ReadMessage()
		if err != nil {
			// guacdTunnel.Read() 会阻塞，所以要先把guacdTunnel客户端关闭，才能退出Guacd循环
			_ = guacdTunnel.Close()

			observerId := nextSession.ID
			forObsSession.Observer.Del(observerId)
			return nil
		}
		_, err = guacdTunnel.WriteAndFlush(message)
		if err != nil {
			service.SessionService.CloseSessionById(sessionId, TunnelClosed, "远程连接已关闭")
			return nil
		}
	}
}

func (api GuacamoleApi) setConfig(propertyMap map[string]string, s model.Session, configuration *guacamole.Configuration) {
	if propertyMap[guacamole.EnableRecording] == "true" {
		configuration.SetParameter(guacamole.RecordingPath, path.Join(config.GlobalCfg.Guacd.Recording, s.ID))
		configuration.SetParameter(guacamole.CreateRecordingPath, "true")
	} else {
		configuration.SetParameter(guacamole.RecordingPath, "")
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
		configuration.SetParameter(guacamole.EnableWallpaper, propertyMap[guacamole.EnableWallpaper])
		configuration.SetParameter(guacamole.EnableTheming, propertyMap[guacamole.EnableTheming])
		configuration.SetParameter(guacamole.EnableFontSmoothing, propertyMap[guacamole.EnableFontSmoothing])
		configuration.SetParameter(guacamole.EnableFullWindowDrag, propertyMap[guacamole.EnableFullWindowDrag])
		configuration.SetParameter(guacamole.EnableDesktopComposition, propertyMap[guacamole.EnableDesktopComposition])
		configuration.SetParameter(guacamole.EnableMenuAnimations, propertyMap[guacamole.EnableMenuAnimations])
		configuration.SetParameter(guacamole.DisableBitmapCaching, propertyMap[guacamole.DisableBitmapCaching])
		configuration.SetParameter(guacamole.DisableOffscreenCaching, propertyMap[guacamole.DisableOffscreenCaching])
		configuration.SetParameter(guacamole.ColorDepth, propertyMap[guacamole.ColorDepth])
		configuration.SetParameter(guacamole.ForceLossless, propertyMap[guacamole.ForceLossless])
		configuration.SetParameter(guacamole.PreConnectionId, propertyMap[guacamole.PreConnectionId])
		configuration.SetParameter(guacamole.PreConnectionBlob, propertyMap[guacamole.PreConnectionBlob])
	case "ssh":
		if len(s.PrivateKey) > 0 && s.PrivateKey != "-" {
			configuration.SetParameter("username", s.Username)
			configuration.SetParameter("private-key", s.PrivateKey)
			configuration.SetParameter("passphrase", s.Passphrase)
		} else {
			configuration.SetParameter("username", s.Username)
			configuration.SetParameter("password", s.Password)
		}

		configuration.SetParameter(guacamole.FontSize, propertyMap[guacamole.FontSize])
		configuration.SetParameter(guacamole.FontName, propertyMap[guacamole.FontName])
		configuration.SetParameter(guacamole.ColorScheme, propertyMap[guacamole.ColorScheme])
		configuration.SetParameter(guacamole.Backspace, propertyMap[guacamole.Backspace])
		configuration.SetParameter(guacamole.TerminalType, propertyMap[guacamole.TerminalType])
	case "vnc":
		configuration.SetParameter("username", s.Username)
		configuration.SetParameter("password", s.Password)
	case "telnet":
		configuration.SetParameter("username", s.Username)
		configuration.SetParameter("password", s.Password)

		configuration.SetParameter(guacamole.FontSize, propertyMap[guacamole.FontSize])
		configuration.SetParameter(guacamole.FontName, propertyMap[guacamole.FontName])
		configuration.SetParameter(guacamole.ColorScheme, propertyMap[guacamole.ColorScheme])
		configuration.SetParameter(guacamole.Backspace, propertyMap[guacamole.Backspace])
		configuration.SetParameter(guacamole.TerminalType, propertyMap[guacamole.TerminalType])
	case "kubernetes":
		configuration.SetParameter(guacamole.FontSize, propertyMap[guacamole.FontSize])
		configuration.SetParameter(guacamole.FontName, propertyMap[guacamole.FontName])
		configuration.SetParameter(guacamole.ColorScheme, propertyMap[guacamole.ColorScheme])
		configuration.SetParameter(guacamole.Backspace, propertyMap[guacamole.Backspace])
		configuration.SetParameter(guacamole.TerminalType, propertyMap[guacamole.TerminalType])
	default:

	}
}
