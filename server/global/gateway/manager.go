package gateway

type Manager struct {
	gateways map[string]*Gateway

	Add chan *Gateway
	Del chan string
}

func NewManager() *Manager {
	return &Manager{
		Add:      make(chan *Gateway),
		Del:      make(chan string),
		gateways: map[string]*Gateway{},
	}
}

func (m *Manager) Run() {
	for {
		select {
		case g := <-m.Add:
			m.gateways[g.ID] = g
			go g.Run()
		case k := <-m.Del:
			if _, ok := m.gateways[k]; ok {
				m.gateways[k].Close()
				delete(m.gateways, k)
			}
		}
	}
}

func (m Manager) GetById(id string) *Gateway {
	return m.gateways[id]
}

var GlobalGatewayManager *Manager

func init() {
	GlobalGatewayManager = NewManager()
	go GlobalGatewayManager.Run()
}
