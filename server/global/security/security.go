package security

import "sort"

type Security struct {
	ID       string
	Rule     string
	IP       string
	Priority int64 // 越小优先级越高
}

type Manager struct {
	securities map[string]*Security
	values     []*Security

	Add chan *Security
	Del chan string
}

func NewManager() *Manager {
	return &Manager{
		Add:        make(chan *Security),
		Del:        make(chan string),
		securities: map[string]*Security{},
	}
}

func (m *Manager) Run() {
	for {
		select {
		case s := <-m.Add:
			m.securities[s.ID] = s
			m.LoadData()
		case s := <-m.Del:
			if _, ok := m.securities[s]; ok {
				delete(m.securities, s)
				m.LoadData()
			}
		}
	}
}

func (m *Manager) Clear() {
	m.securities = map[string]*Security{}
}

func (m *Manager) LoadData() {
	var values []*Security
	for _, security := range m.securities {
		values = append(values, security)
	}

	sort.Slice(values, func(i, j int) bool {
		// 优先级数字越小代表优先级越高，因此此处用小于号
		return values[i].Priority < values[j].Priority
	})

	m.values = values
}

func (m Manager) Values() []*Security {
	return m.values
}

var GlobalSecurityManager *Manager

func init() {
	GlobalSecurityManager = NewManager()
	go GlobalSecurityManager.Run()
}
