package gateway

import (
	"fmt"
	"io"
	"net"

	"golang.org/x/crypto/ssh"
)

type Tunnel struct {
	id                string // 唯一标识
	localHost         string // 本地监听地址
	localPort         int    // 本地端口
	remoteHost        string // 远程连接地址
	remotePort        int    // 远程端口
	listener          net.Listener
	localConnections  []net.Conn
	remoteConnections []net.Conn
}

func (r *Tunnel) Open(sshClient *ssh.Client) {

	for {
		localConn, err := r.listener.Accept()
		if err != nil {
			return
		}
		r.localConnections = append(r.localConnections, localConn)

		remoteAddr := fmt.Sprintf("%s:%d", r.remoteHost, r.remotePort)
		remoteConn, err := sshClient.Dial("tcp", remoteAddr)
		if err != nil {
			return
		}
		r.remoteConnections = append(r.remoteConnections, remoteConn)

		go copyConn(localConn, remoteConn)
		go copyConn(remoteConn, localConn)
	}
}

func (r *Tunnel) Close() {
	for i := range r.localConnections {
		_ = r.localConnections[i].Close()
	}
	r.localConnections = nil
	for i := range r.remoteConnections {
		_ = r.remoteConnections[i].Close()
	}
	r.remoteConnections = nil
	_ = r.listener.Close()
}

func copyConn(writer, reader net.Conn) {
	_, _ = io.Copy(writer, reader)
}
