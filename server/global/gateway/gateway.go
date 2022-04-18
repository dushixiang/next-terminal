package gateway

import (
	"context"
	"errors"
	"fmt"
	"net"
	"os"

	"next-terminal/server/utils"

	"golang.org/x/crypto/ssh"
)

// Gateway 接入网关
type Gateway struct {
	ID        string // 接入网关ID
	Connected bool   // 是否已连接
	SshClient *ssh.Client
	Message   string // 失败原因

	tunnels map[string]*Tunnel

	Add  chan *Tunnel
	Del  chan string
	exit chan bool
}

func NewGateway(id string, connected bool, message string, client *ssh.Client) *Gateway {
	return &Gateway{
		ID:        id,
		Connected: connected,
		Message:   message,
		SshClient: client,
		Add:       make(chan *Tunnel),
		Del:       make(chan string),
		tunnels:   map[string]*Tunnel{},
		exit:      make(chan bool, 1),
	}
}

func (g *Gateway) Run() {
	for {
		select {
		case t := <-g.Add:
			g.tunnels[t.ID] = t
			go t.Open()
		case k := <-g.Del:
			if _, ok := g.tunnels[k]; ok {
				g.tunnels[k].Close()
				delete(g.tunnels, k)
			}
		case <-g.exit:
			return
		}
	}
}

func (g *Gateway) Close() {
	g.exit <- true
	if g.SshClient != nil {
		_ = g.SshClient.Close()
	}
	if len(g.tunnels) > 0 {
		for _, tunnel := range g.tunnels {
			tunnel.Close()
		}
	}
}

func (g *Gateway) OpenSshTunnel(id, ip string, port int) (exposedIP string, exposedPort int, err error) {
	if !g.Connected {
		return "", 0, errors.New(g.Message)
	}

	localPort, err := utils.GetAvailablePort()
	if err != nil {
		return "", 0, err
	}

	hostname, err := os.Hostname()
	if err != nil {
		return "", 0, err
	}

	// debug
	//hostname = "0.0.0.0"

	localAddr := fmt.Sprintf("%s:%d", hostname, localPort)
	listener, err := net.Listen("tcp", localAddr)
	if err != nil {
		return "", 0, err
	}

	ctx, cancel := context.WithCancel(context.Background())
	tunnel := &Tunnel{
		ID:        id,
		LocalHost: hostname,
		//LocalHost:  "docker.for.mac.host.internal",
		LocalPort:  localPort,
		Gateway:    g,
		RemoteHost: ip,
		RemotePort: port,
		ctx:        ctx,
		cancel:     cancel,
		listener:   listener,
	}
	g.Add <- tunnel

	return tunnel.LocalHost, tunnel.LocalPort, nil
}

func (g Gateway) CloseSshTunnel(id string) {
	if g.tunnels[id] != nil {
		g.tunnels[id].Close()
	}
}
