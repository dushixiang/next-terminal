package api

import (
	"context"
	"time"
	"unicode/utf8"

	"next-terminal/server/dto"
	"next-terminal/server/global/session"
	"next-terminal/server/term"

	"github.com/gorilla/websocket"
)

type TermHandler struct {
	sessionId    string
	isRecording  bool
	ws           *websocket.Conn
	nextTerminal *term.NextTerminal
	ctx          context.Context
	cancel       context.CancelFunc
	dataChan     chan rune
	tick         *time.Ticker
}

func NewTermHandler(sessionId string, isRecording bool, ws *websocket.Conn, nextTerminal *term.NextTerminal) *TermHandler {
	ctx, cancel := context.WithCancel(context.Background())
	tick := time.NewTicker(time.Millisecond * time.Duration(60))
	return &TermHandler{
		sessionId:    sessionId,
		isRecording:  isRecording,
		ws:           ws,
		nextTerminal: nextTerminal,
		ctx:          ctx,
		cancel:       cancel,
		dataChan:     make(chan rune),
		tick:         tick,
	}
}

func (r TermHandler) Start() {
	go r.readFormTunnel()
	go r.writeToWebsocket()
}

func (r TermHandler) Stop() {
	r.tick.Stop()
	r.cancel()
}

func (r TermHandler) readFormTunnel() {
	for {
		select {
		case <-r.ctx.Done():
			return
		default:
			rn, size, err := r.nextTerminal.StdoutReader.ReadRune()
			if err != nil {
				return
			}
			if size > 0 {
				r.dataChan <- rn
			}
		}
	}
}

func (r TermHandler) writeToWebsocket() {
	var buf []byte
	for {
		select {
		case <-r.ctx.Done():
			return
		case <-r.tick.C:
			if len(buf) > 0 {
				s := string(buf)
				if err := WriteMessage(r.ws, dto.NewMessage(Data, s)); err != nil {
					return
				}
				// 录屏
				if r.isRecording {
					_ = r.nextTerminal.Recorder.WriteData(s)
				}
				nextSession := session.GlobalSessionManager.GetById(r.sessionId)
				// 监控
				if nextSession != nil && len(nextSession.Observer.All()) > 0 {
					obs := nextSession.Observer.All()
					for _, ob := range obs {
						_ = WriteMessage(ob.WebSocket, dto.NewMessage(Data, s))
					}
				}
				buf = []byte{}
			}
		case data := <-r.dataChan:
			if data != utf8.RuneError {
				p := make([]byte, utf8.RuneLen(data))
				utf8.EncodeRune(p, data)
				buf = append(buf, p...)
			} else {
				buf = append(buf, []byte("@")...)
			}
		}
	}
}
