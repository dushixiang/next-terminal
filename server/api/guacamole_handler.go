package api

import (
	"context"
	"time"

	"next-terminal/server/guacd"
	"next-terminal/server/log"
	"next-terminal/server/utils"

	"github.com/gorilla/websocket"
)

type GuacamoleHandler struct {
	ws       *websocket.Conn
	tunnel   *guacd.Tunnel
	ctx      context.Context
	cancel   context.CancelFunc
	dataChan chan []byte
	tick     *time.Ticker
}

func NewGuacamoleHandler(ws *websocket.Conn, tunnel *guacd.Tunnel) *GuacamoleHandler {
	ctx, cancel := context.WithCancel(context.Background())
	tick := time.NewTicker(time.Millisecond * time.Duration(60))
	return &GuacamoleHandler{
		ws:       ws,
		tunnel:   tunnel,
		ctx:      ctx,
		cancel:   cancel,
		dataChan: make(chan []byte),
		tick:     tick,
	}
}

func (r GuacamoleHandler) Start() {
	go r.readFormTunnel()
	go r.writeToWebsocket()
}

func (r GuacamoleHandler) Stop() {
	r.tick.Stop()
	r.cancel()
}

func (r GuacamoleHandler) readFormTunnel() {
	for {
		select {
		case <-r.ctx.Done():
			return
		default:
			instruction, err := r.tunnel.Read()
			if err != nil {
				utils.Disconnect(r.ws, TunnelClosed, "远程连接已关闭")
				return
			}
			if len(instruction) == 0 {
				continue
			}
			r.dataChan <- instruction
		}
	}
}

func (r GuacamoleHandler) writeToWebsocket() {
	var buf []byte
	for {
		select {
		case <-r.ctx.Done():
			return
		case <-r.tick.C:
			if len(buf) > 0 {
				err := r.ws.WriteMessage(websocket.TextMessage, buf)
				if err != nil {
					log.Debugf("WebSocket写入失败，即将关闭Guacd连接...")
					return
				}
				buf = []byte{}
			}
		case data := <-r.dataChan:
			buf = append(buf, data...)
		}
	}
}
