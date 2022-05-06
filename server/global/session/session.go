package session

import (
	"sync"

	"next-terminal/server/dto"
	"next-terminal/server/guacd"
	"next-terminal/server/log"
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
	mutex        sync.Mutex
}

func (s *Session) WriteMessage(msg dto.Message) error {
	if s.WebSocket == nil {
		return nil
	}
	defer s.mutex.Unlock()
	s.mutex.Lock()
	message := []byte(msg.ToString())
	return s.WebSocket.WriteMessage(websocket.TextMessage, message)
}

func (s *Session) WriteString(str string) error {
	if s.WebSocket == nil {
		return nil
	}
	defer s.mutex.Unlock()
	s.mutex.Lock()
	message := []byte(str)
	return s.WebSocket.WriteMessage(websocket.TextMessage, message)
}

func (s *Session) Close() {
	if s.GuacdTunnel != nil {
		_ = s.GuacdTunnel.Close()
	}
	if s.NextTerminal != nil {
		s.NextTerminal.Close()
	}
	if s.WebSocket != nil {
		_ = s.WebSocket.Close()
	}
}

type Manager struct {
	id       string
	sessions sync.Map
}

func NewManager() *Manager {
	return &Manager{}
}

func NewObserver(id string) *Manager {
	return &Manager{
		id: id,
	}
}

func (m *Manager) GetById(id string) *Session {
	value, ok := m.sessions.Load(id)
	if ok {
		return value.(*Session)
	}
	return nil
}

func (m *Manager) Add(s *Session) {
	m.sessions.Store(s.ID, s)
	log.Infof("add session: %s", s.ID)
}

func (m *Manager) Del(id string) {
	session := m.GetById(id)
	if session != nil {
		session.Close()
		if session.Observer != nil {
			session.Observer.Clear()
		}
	}
	m.sessions.Delete(id)
	log.Infof("del session: %s", id)
}

func (m *Manager) Clear() {
	m.sessions.Range(func(key, value interface{}) bool {
		if session, ok := value.(*Session); ok {
			session.Close()
		}
		m.sessions.Delete(key)
		return true
	})
}

func (m *Manager) Range(f func(key string, value *Session)) {
	m.sessions.Range(func(key, value interface{}) bool {
		if session, ok := value.(*Session); ok {
			f(key.(string), session)
		}
		return true
	})
}

var GlobalSessionManager *Manager

func init() {
	GlobalSessionManager = NewManager()
}
