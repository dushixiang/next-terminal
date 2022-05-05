package gateway

import (
	"sync"

	"next-terminal/server/log"
)

type Manager struct {
	gateways *sync.Map

	Add chan *Gateway
	Del chan string
}

func NewManager() *Manager {
	return &Manager{
		Add:      make(chan *Gateway),
		Del:      make(chan string),
		gateways: new(sync.Map),
	}
}

func (m *Manager) Start() {
	for {
		select {
		case g := <-m.Add:
			m.gateways.Store(g.ID, g)
			log.Info("add gateway: %s", g.ID)
			go g.Run()
		case k := <-m.Del:
			if val, ok := m.gateways.Load(k); ok {
				if vv, vok := val.(*Gateway); vok {
					vv.Close()
					m.gateways.Delete(k)
				}

			}
		}
	}
}

func (m Manager) GetById(id string) *Gateway {
	if val, ok := m.gateways.Load(id); ok {
		return val.(*Gateway)
	}
	return nil
}

var GlobalGatewayManager *Manager

func init() {
	GlobalGatewayManager = NewManager()
	go GlobalGatewayManager.Start()
}
