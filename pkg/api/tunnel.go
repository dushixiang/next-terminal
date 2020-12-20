package api

import (
	"next-terminal/pkg/config"
	"next-terminal/pkg/guacd"
	"next-terminal/pkg/model"
	"fmt"
	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
	"github.com/pkg/sftp"
	"log"
	"strconv"
)

func TunEndpoint(c echo.Context) error {

	ws, err := UpGrader.Upgrade(c.Response().Writer, c.Request(), nil)
	if err != nil {
		return err
	}

	width := c.QueryParam("width")
	height := c.QueryParam("height")
	sessionId := c.QueryParam("sessionId")
	connectionId := c.QueryParam("connectionId")

	intWidth, _ := strconv.Atoi(width)
	intHeight, _ := strconv.Atoi(height)

	configuration := guacd.NewConfiguration()
	configuration.SetParameter("width", width)
	configuration.SetParameter("height", height)

	propertyMap := model.FindAllPropertiesMap()

	for name := range propertyMap {

		if name == model.GuacdFontSize {
			fontSize, _ := strconv.Atoi(propertyMap[name])
			fontSize = fontSize * 2
			configuration.SetParameter(name, strconv.Itoa(fontSize))
		} else {
			configuration.SetParameter(name, propertyMap[name])
		}
	}

	var session model.Session
	var sftpClient *sftp.Client

	if len(connectionId) > 0 {
		session, err = model.FindSessionByConnectionId(connectionId)
		if err != nil {
			return err
		}
		configuration.ConnectionID = connectionId
	} else {
		session, err = model.FindSessionById(sessionId)
		if err != nil {
			return err
		}

		configuration.Protocol = session.Protocol
		switch configuration.Protocol {
		case "rdp":
			configuration.SetParameter("username", session.Username)
			configuration.SetParameter("password", session.Password)

			configuration.SetParameter("security", "any")
			configuration.SetParameter("ignore-cert", "true")
			configuration.SetParameter("create-drive-path", "true")

			configuration.SetParameter("dpi", "96")
			configuration.SetParameter("resize-method", "reconnect")
			configuration.SetParameter("enable-sftp", "")
			break
		case "ssh":
			configuration.SetParameter("username", session.Username)
			configuration.SetParameter("password", session.Password)

			sftpClient, err = CreateSftpClient(session.Username, session.Password, session.IP, session.Port)
			if err != nil {
				return err
			}
			break
		case "vnc":
			configuration.SetParameter("password", session.Password)
			configuration.SetParameter("enable-sftp", "")
			break
		case "telnet":
			configuration.SetParameter("username", session.Username)
			configuration.SetParameter("password", session.Password)
			configuration.SetParameter("enable-sftp", "")
			break
		}

		configuration.SetParameter("hostname", session.IP)
		configuration.SetParameter("port", strconv.Itoa(session.Port))
	}

	addr := propertyMap[model.GuacdHost] + ":" + propertyMap[model.GuacdPort]
	tunnel, err := guacd.NewTunnel(addr, configuration)
	if err != nil {
		return err
	}

	fmt.Printf("=====================================================\n")
	fmt.Printf("connect to %v with config: %+v\n", addr, configuration)
	fmt.Printf("=====================================================\n")

	tun := config.Tun{
		Tun:        tunnel,
		SftpClient: sftpClient,
	}

	config.Store.Set(sessionId, tun)

	if len(session.ConnectionId) == 0 {
		session.ConnectionId = tunnel.UUID
		session.Width = intWidth
		session.Height = intHeight

		model.UpdateSessionById(&session, sessionId)
	}

	go func() {
		for true {
			instruction, err := tunnel.Read()
			if err != nil {
				CloseSession(sessionId, tun)
				log.Printf("WS读取异常: %v", err)
				break
			}
			//fmt.Printf("<= %v \n", string(instruction))
			err = ws.WriteMessage(websocket.TextMessage, instruction)
			if err != nil {
				CloseSession(sessionId, tun)
				log.Printf("WS写入异常: %v", err)
				break
			}
		}
	}()

	for true {
		_, message, err := ws.ReadMessage()
		if err != nil {
			CloseSession(sessionId, tun)
			log.Printf("Tunnel读取异常: %v", err)
			break
		}
		_, err = tunnel.WriteAndFlush(message)
		if err != nil {
			CloseSession(sessionId, tun)
			log.Printf("Tunnel写入异常: %v", err)
			break
		}
	}
	return err
}
