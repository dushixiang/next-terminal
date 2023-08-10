package gateway

import (
	"sync"

	"next-terminal/server/model"
)

type manager struct {
	gateways sync.Map
}

func (m *manager) GetById(id string) *Gateway {
	if val, ok := m.gateways.Load(id); ok {
		return val.(*Gateway)
	}
	return nil
}

func (m *manager) Add(model *model.AccessGateway) *Gateway {
	g := &Gateway{
		ID:          model.ID,
		GatewayType: model.GatewayType,
		IP:          model.IP,
		Port:        model.Port,
		Username:    model.Username,
		Password:    model.Password,
		PrivateKey:  model.PrivateKey,
		Passphrase:  model.Passphrase,
		Connected:   false,
		SshClient:   nil,
		Message:     "暂未使用",
		tunnels:     make(map[string]*Tunnel),
	}
	m.gateways.Store(g.ID, g)
	return g
}

func (m *manager) Del(id string) {
	g := m.GetById(id)
	if g != nil {
		g.Close()
	}
	m.gateways.Delete(id)
}

var GlobalGatewayManager *manager

func init() {
	GlobalGatewayManager = &manager{}
}
