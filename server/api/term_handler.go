package api

import (
	"bytes"
	"context"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/gorilla/websocket"
	"next-terminal/server/common/term"
	"next-terminal/server/dto"
	"next-terminal/server/global/session"
)

type TermHandler struct {
	sessionId    string
	isRecording  bool
	webSocket    *websocket.Conn
	nextTerminal *term.NextTerminal
	ctx          context.Context
	cancel       context.CancelFunc
	dataChan     chan rune
	tick         *time.Ticker
	mutex        sync.Mutex
	buf          bytes.Buffer
}

func NewTermHandler(userId, assetId, sessionId string, isRecording bool, ws *websocket.Conn, nextTerminal *term.NextTerminal) *TermHandler {
	ctx, cancel := context.WithCancel(context.Background())
	tick := time.NewTicker(time.Millisecond * time.Duration(60))

	return &TermHandler{
		sessionId:    sessionId,
		isRecording:  isRecording,
		webSocket:    ws,
		nextTerminal: nextTerminal,
		ctx:          ctx,
		cancel:       cancel,
		dataChan:     make(chan rune),
		tick:         tick,
	}
}

func (r *TermHandler) Start() {
	go r.readFormTunnel()
	go r.writeToWebsocket()
}

func (r *TermHandler) Stop() {
	// 会话结束时记录最后一个命令
	r.tick.Stop()
	r.cancel()
}

func (r *TermHandler) readFormTunnel() {
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

func (r *TermHandler) writeToWebsocket() {
	for {
		select {
		case <-r.ctx.Done():
			return
		case <-r.tick.C:
			s := r.buf.String()
			if s == "" {
				continue
			}
			if err := r.SendMessageToWebSocket(dto.NewMessage(Data, s)); err != nil {
				return
			}
			// 录屏
			if r.isRecording {
				_ = r.nextTerminal.Recorder.WriteData(s)
			}
			// 监控
			SendObData(r.sessionId, s)
			r.buf.Reset()
		case data := <-r.dataChan:
			if data != utf8.RuneError {
				p := make([]byte, utf8.RuneLen(data))
				utf8.EncodeRune(p, data)
				r.buf.Write(p)
			} else {
				r.buf.Write([]byte("@"))
			}
		}
	}
}

func (r *TermHandler) Write(input []byte) error {
	// 正常的字符输入
	_, err := r.nextTerminal.Write(input)
	return err
}

func (r *TermHandler) WindowChange(h int, w int) error {
	return r.nextTerminal.WindowChange(h, w)
}

func (r *TermHandler) SendRequest() error {
	_, _, err := r.nextTerminal.SshClient.Conn.SendRequest("helloworld1024@foxmail.com", true, nil)
	return err
}

func (r *TermHandler) SendMessageToWebSocket(msg dto.Message) error {
	if r.webSocket == nil {
		return nil
	}
	defer r.mutex.Unlock()
	r.mutex.Lock()
	message := []byte(msg.ToString())
	return r.webSocket.WriteMessage(websocket.TextMessage, message)
}

func SendObData(sessionId, s string) {
	nextSession := session.GlobalSessionManager.GetById(sessionId)
	if nextSession != nil && nextSession.Observer != nil {
		nextSession.Observer.Range(func(key string, ob *session.Session) {
			_ = ob.WriteMessage(dto.NewMessage(Data, s))
		})
	}
}
