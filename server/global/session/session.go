package session

import (
	"fmt"
	"next-terminal/server/guacd"
	"next-terminal/server/term"

	"github.com/gorilla/websocket"
)

type Session struct {
	ID           string
	Protocol     string
	Mode         string
	WebSocket    *websocket.Conn
	GuacdTunnel  *guacd.Tunnel
	NextTerminal *term.NextTerminal
	Observer     *Manager
}

type Manager struct {
	id       string
	sessions map[string]*Session

	Add  chan *Session
	Del  chan string
	exit chan bool
}

func NewManager() *Manager {
	return &Manager{
		Add:      make(chan *Session),
		Del:      make(chan string),
		sessions: map[string]*Session{},
		exit:     make(chan bool, 1),
	}
}

func NewObserver(id string) *Manager {
	return &Manager{
		id:       id,
		Add:      make(chan *Session),
		Del:      make(chan string),
		sessions: map[string]*Session{},
		exit:     make(chan bool, 1),
	}
}

func (m *Manager) Run() {
	defer fmt.Printf("Session Manager %v End\n", m.id)
	fmt.Printf("Session Manager %v  Run\n", m.id)
	for {
		select {
		case s := <-m.Add:
			m.sessions[s.ID] = s
		case k := <-m.Del:
			if _, ok := m.sessions[k]; ok {
				ss := m.sessions[k]
				if ss.GuacdTunnel != nil {
					_ = ss.GuacdTunnel.Close()
				}
				if ss.NextTerminal != nil {
					_ = ss.NextTerminal.Close()
				}

				if ss.WebSocket != nil {
					_ = ss.WebSocket.Close()
				}
				if ss.Observer != nil {
					ss.Observer.Close()
				}
				delete(m.sessions, k)
			}
		case <-m.exit:
			return
		}
	}
}

func (m *Manager) Close() {
	m.exit <- true
}

func (m Manager) GetById(id string) *Session {
	return m.sessions[id]
}

func (m Manager) All() map[string]*Session {
	return m.sessions
}

var GlobalSessionManager *Manager

func init() {
	GlobalSessionManager = NewManager()
	go GlobalSessionManager.Run()
}
