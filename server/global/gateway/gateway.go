package gateway

import (
	"bytes"
	"errors"
	"fmt"
	"net"
	"next-terminal/server/common/term"
	"os"
	"sync"

	"next-terminal/server/utils"

	"golang.org/x/crypto/ssh"
)

// Gateway 接入网关
type Gateway struct {
	ID          string // 接入网关ID
	GatewayType string // 网关类型
	IP          string
	Port        int
	Username    string
	Password    string
	PrivateKey  string
	Passphrase  string
	Command     string
	Connected   bool   // 是否已连接
	Message     string // 失败原因
	SshClient   *ssh.Client

	open    func(*Tunnel)
	mutex   sync.Mutex
	tunnels map[string]*Tunnel
}

func (g *Gateway) connectProxy(ip string, port int) error {
	switch g.GatewayType {
	case "sshProxyCommand":
		// %h %p 表示原代理的sshIP
		b := bytes.Buffer{}
		placeholder := false
		for _, word := range g.Command {
			s := string(word)
			if placeholder {
				placeholder = false
				if s == "h" || s == "H" {
					b.WriteString(ip)
				} else if s == "p" || s == "P" {
					b.WriteRune(rune(port))
				} else if s == "%" {
					b.WriteString("%")
				} else {
					b.WriteString("%")
					b.WriteRune(word)
				}
			} else {
				if s == "%" {
					placeholder = true
					continue
				}
				b.WriteRune(word)
			}
		}
		args, err := parseCommandLine(b.String())
		if err != nil {
			return err
		}
		g.open = func(t *Tunnel) {
			t.OpenCommand(args)
		}
	case "ssh":
		sshClient, err := term.NewSshClient(g.IP, g.Port, g.Username, g.Password, g.PrivateKey, g.Passphrase)
		if err != nil {
			return errors.New(g.Message)
		}
		g.SshClient = sshClient
		g.open = func(t *Tunnel) {
			t.OpenSSHClient(g.SshClient)
		}
	}
	return nil
}

func (g *Gateway) OpenSshTunnel(id, ip string, port int) (exposedIP string, exposedPort int, err error) {
	g.mutex.Lock()
	defer g.mutex.Unlock()
	if !g.Connected {
		if err := g.connectProxy(ip, port); err != nil {
			g.Connected = false
			g.Message = "接入网关不可用：" + err.Error()
			return "", 0, err
		}
		g.Connected = true
		g.Message = "使用中"
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

	tunnel := &Tunnel{
		id:        id,
		localHost: hostname,
		//localHost:  "docker.for.mac.host.internal",
		localPort:  localPort,
		remoteHost: ip,
		remotePort: port,
		listener:   listener,
	}
	go g.open(tunnel)
	g.tunnels[tunnel.id] = tunnel

	return tunnel.localHost, tunnel.localPort, nil
}

func (g *Gateway) CloseSshTunnel(id string) {
	g.mutex.Lock()
	defer g.mutex.Unlock()
	t := g.tunnels[id]
	if t != nil {
		t.Close()
		delete(g.tunnels, id)
	}

	if len(g.tunnels) == 0 {
		if g.SshClient != nil {
			_ = g.SshClient.Close()
		}
		g.Connected = false
		g.Message = "暂未使用"
	}
}

func (g *Gateway) Close() {
	for id := range g.tunnels {
		g.CloseSshTunnel(id)
	}
}

func parseCommandLine(command string) ([]string, error) {
	var args []string
	state := "start"
	current := ""
	quote := "\""
	escapeNext := true
	for _, c := range command {
		if state == "quotes" {
			if string(c) != quote {
				current += string(c)
			} else {
				args = append(args, current)
				current = ""
				state = "start"
			}
			continue
		}

		if escapeNext {
			current += string(c)
			escapeNext = false
			continue
		}

		if c == '\\' {
			escapeNext = true
			continue
		}

		if c == '"' || c == '\'' {
			state = "quotes"
			quote = string(c)
			continue
		}

		if state == "arg" {
			if c == ' ' || c == '\t' {
				args = append(args, current)
				current = ""
				state = "start"
			} else {
				current += string(c)
			}
			continue
		}

		if c != ' ' && c != '\t' {
			state = "arg"
			current += string(c)
		}
	}

	if state == "quotes" {
		return []string{}, errors.New(fmt.Sprintf("Unclosed quote in command line: %s", command))
	}

	if current != "" {
		args = append(args, current)
	}

	return args, nil
}
