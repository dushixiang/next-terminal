package global

import (
	"github.com/gorilla/websocket"
	"next-terminal/pkg/guacd"
	"next-terminal/pkg/term"
	"strconv"
	"sync"
)

type Tun struct {
	Protocol     string
	WebSocket    *websocket.Conn
	Tunnel       *guacd.Tunnel
	NextTerminal *term.NextTerminal
}

func (r *Tun) Close(code int, reason string) {
	if r.Tunnel != nil {
		_ = r.Tunnel.Close()
	}
	if r.NextTerminal != nil {
		_ = r.NextTerminal.Close()
	}

	ws := r.WebSocket
	if ws != nil {
		if r.Protocol == "rdp" || r.Protocol == "vnc" {
			err := guacd.NewInstruction("error", reason, strconv.Itoa(code))
			_ = ws.WriteMessage(websocket.TextMessage, []byte(err.String()))
			disconnect := guacd.NewInstruction("disconnect")
			_ = ws.WriteMessage(websocket.TextMessage, []byte(disconnect.String()))
		} else {
			msg := `{"type":"closed","content":"` + reason + `"}`
			_ = ws.WriteMessage(websocket.TextMessage, []byte(msg))
		}
	}
}

type Observable struct {
	Subject   *Tun
	Observers []Tun
}

type TunStore struct {
	m sync.Map
}

func (s *TunStore) Set(k string, v *Observable) {
	s.m.Store(k, v)
}

func (s *TunStore) Del(k string) {
	s.m.Delete(k)
}

func (s *TunStore) Get(k string) (item *Observable, ok bool) {
	value, ok := s.m.Load(k)
	if ok {
		return value.(*Observable), true
	}
	return item, false
}

func NewStore() *TunStore {
	store := TunStore{sync.Map{}}
	return &store
}
