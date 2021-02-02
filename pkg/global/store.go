package global

import (
	"github.com/gorilla/websocket"
	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
	"next-terminal/pkg/guacd"
	"sync"
)

type Tun struct {
	Protocol   string
	Tunnel     *guacd.Tunnel
	SshClient  *ssh.Client
	SftpClient *sftp.Client
	WebSocket  *websocket.Conn
}

func (r *Tun) Close() {
	if r.Protocol == "rdp" || r.Protocol == "vnc" {
		_ = r.Tunnel.Close()
	} else {
		if r.SshClient != nil {
			_ = r.SshClient.Close()
		}

		if r.SftpClient != nil {
			_ = r.SftpClient.Close()
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
