package gateway

import (
	"context"
	"fmt"
	"io"
	"net"

	"next-terminal/server/log"
)

type Tunnel struct {
	ID         string // 唯一标识
	LocalHost  string // 本地监听地址
	LocalPort  int    // 本地端口
	RemoteHost string // 远程连接地址
	RemotePort int    // 远程端口
	Gateway    *Gateway
	ctx        context.Context
	cancel     context.CancelFunc
	listener   net.Listener
	err        error
}

func (r *Tunnel) Open() {
	localAddr := fmt.Sprintf("%s:%d", r.LocalHost, r.LocalPort)
	for {
		select {
		case <-r.ctx.Done():
			_ = r.listener.Close()
			log.Debugf("SSH 隧道 %v 关闭", localAddr)
			return
		default:
			log.Debugf("等待客户端访问 %v", localAddr)
			localConn, err := r.listener.Accept()
			if err != nil {
				log.Debugf("接受连接失败 %v", err.Error())
				continue
			}

			log.Debugf("客户端 %v 连接至 %v", localConn.RemoteAddr().String(), localAddr)
			remoteAddr := fmt.Sprintf("%s:%d", r.RemoteHost, r.RemotePort)
			log.Debugf("连接远程主机 %v ...", remoteAddr)
			remoteConn, err := r.Gateway.SshClient.Dial("tcp", remoteAddr)
			if err != nil {
				log.Debugf("连接远程主机 %v 失败", remoteAddr)
				r.err = err
				return
			}

			log.Debugf("连接远程主机 %v 成功", remoteAddr)
			go copyConn(r.ctx, localConn, remoteConn)
			go copyConn(r.ctx, remoteConn, localConn)
			log.Debugf("转发数据 [%v]->[%v]", localAddr, remoteAddr)
		}
	}
}

func (r Tunnel) Close() {
	r.cancel()
	err := r.listener.Close()
	if err != nil {
		return
	}
}

func copyConn(ctx context.Context, writer, reader net.Conn) {
	_, _ = io.Copy(writer, reader)
	for {
		select {
		case <-ctx.Done():
			_ = writer.Close()
			_ = reader.Close()
			return
		}
	}

}
