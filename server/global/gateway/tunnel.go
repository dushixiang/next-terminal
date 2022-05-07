package gateway

import (
	"fmt"
	"io"
	"net"

	"next-terminal/server/log"

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
	localAddr := fmt.Sprintf("%s:%d", r.localHost, r.localPort)

	for {
		log.Debugf("隧道 %v 等待客户端访问 %v", r.id, localAddr)
		localConn, err := r.listener.Accept()
		if err != nil {
			log.Debugf("隧道 %v 接受连接失败 %v, 退出循环", r.id, err.Error())
			log.Debug("-------------------------------------------------")
			return
		}
		r.localConnections = append(r.localConnections, localConn)

		log.Debugf("隧道 %v 新增本地连接 %v", r.id, localConn.RemoteAddr().String())
		remoteAddr := fmt.Sprintf("%s:%d", r.remoteHost, r.remotePort)
		log.Debugf("隧道 %v 连接远程地址 %v ...", r.id, remoteAddr)
		remoteConn, err := sshClient.Dial("tcp", remoteAddr)
		if err != nil {
			log.Debugf("隧道 %v 连接远程地址 %v, 退出循环", r.id, err.Error())
			log.Debug("-------------------------------------------------")
			return
		}
		r.remoteConnections = append(r.remoteConnections, remoteConn)

		log.Debugf("隧道 %v 连接远程主机成功", r.id)
		go copyConn(localConn, remoteConn)
		go copyConn(remoteConn, localConn)
		log.Debugf("隧道 %v 开始转发数据 [%v]->[%v]", r.id, localAddr, remoteAddr)
		log.Debug("~~~~~~~~~~~~~~~~~~~~分割线~~~~~~~~~~~~~~~~~~~~~~~~")
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
	log.Debugf("隧道 %v 监听器关闭", r.id)
}

func copyConn(writer, reader net.Conn) {
	_, _ = io.Copy(writer, reader)
}
