package gateway

import (
	"sync"

	"next-terminal/server/log"
)

type Manager struct {
	gateways sync.Map
}

func NewManager() *Manager {
	return &Manager{}
}

func (m *Manager) GetById(id string) *Gateway {
	if val, ok := m.gateways.Load(id); ok {
		return val.(*Gateway)
	}
	return nil
}

func (m *Manager) Add(g *Gateway) {
	m.gateways.Store(g.ID, g)
	log.Infof("add gateway: %s", g.ID)
}

func (m *Manager) Del(id string) {
	m.gateways.Delete(id)
	log.Infof("del gateway: %s", id)
}

var GlobalGatewayManager *Manager

func init() {
	GlobalGatewayManager = NewManager()
}
