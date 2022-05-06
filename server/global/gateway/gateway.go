package gateway

import (
	"context"
	"errors"
	"fmt"
	"net"
	"os"
	"sync"

	"next-terminal/server/utils"

	"golang.org/x/crypto/ssh"
)

// Gateway 接入网关
type Gateway struct {
	ID        string // 接入网关ID
	Connected bool   // 是否已连接
	SshClient *ssh.Client
	Message   string // 失败原因

	tunnels sync.Map
}

func NewGateway(id string, connected bool, message string, client *ssh.Client) *Gateway {
	return &Gateway{
		ID:        id,
		Connected: connected,
		Message:   message,
		SshClient: client,
	}
}

func (g *Gateway) Close() {
	g.tunnels.Range(func(key, value interface{}) bool {
		g.CloseSshTunnel(key.(string))
		return true
	})
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
	go tunnel.Open()
	g.tunnels.Store(tunnel.ID, tunnel)

	return tunnel.LocalHost, tunnel.LocalPort, nil
}

func (g *Gateway) CloseSshTunnel(id string) {
	if value, ok := g.tunnels.Load(id); ok {
		if tunnel, vok := value.(*Tunnel); vok {
			tunnel.Close()
			g.tunnels.Delete(id)
		}
	}
}
