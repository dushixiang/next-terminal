package global

import (
	"github.com/pkg/sftp"
	"next-terminal/pkg/guacd"
	"sync"
)

type Tun struct {
	Tun        guacd.Tunnel
	SftpClient *sftp.Client
}

type TunStore struct {
	m sync.Map
}

func (s *TunStore) Set(k string, v Tun) {
	s.m.Store(k, v)
}

func (s *TunStore) Del(k string) {
	s.m.Delete(k)
}

func (s *TunStore) Get(k string) (item Tun, ok bool) {
	value, ok := s.m.Load(k)
	if ok {
		return value.(Tun), true
	}
	return item, false
}

func NewStore() *TunStore {
	store := TunStore{sync.Map{}}
	return &store
}
