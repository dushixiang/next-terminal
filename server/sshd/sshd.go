package sshd

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"next-terminal/server/common/nt"
	"os"
	"strings"

	"next-terminal/server/branding"
	"next-terminal/server/config"
	"next-terminal/server/global/security"
	"next-terminal/server/log"
	"next-terminal/server/repository"
	"next-terminal/server/service"
	"next-terminal/server/utils"

	"github.com/gliderlabs/ssh"
	"gorm.io/gorm"
)

var Sshd *sshd

type sshd struct {
	gui *Gui
}

func init() {
	gui := &Gui{}
	Sshd = &sshd{
		gui: gui,
	}
}

func (sshd sshd) passwordAuth(ctx ssh.Context, pass string) bool {
	username := ctx.User()
	remoteAddr := strings.Split(ctx.RemoteAddr().String(), ":")[0]
	user, err := repository.UserRepository.FindByUsername(context.TODO(), username)

	if err != nil {
		// 保存登录日志
		_ = service.UserService.SaveLoginLog(remoteAddr, "terminal", username, false, false, "", "账号或密码不正确")
		return false
	}

	if err := utils.Encoder.Match([]byte(user.Password), []byte(pass)); err != nil {
		// 保存登录日志
		_ = service.UserService.SaveLoginLog(remoteAddr, "terminal", username, false, false, "", "账号或密码不正确")
		return false
	}
	return true
}

func (sshd sshd) connCallback(ctx ssh.Context, conn net.Conn) net.Conn {
	securities := security.GlobalSecurityManager.Values()
	if len(securities) == 0 {
		return conn
	}

	ip := strings.Split(conn.RemoteAddr().String(), ":")[0]

	for _, s := range securities {
		if strings.Contains(s.IP, "/") {
			// CIDR
			_, ipNet, err := net.ParseCIDR(s.IP)
			if err != nil {
				continue
			}
			if !ipNet.Contains(net.ParseIP(ip)) {
				continue
			}
		} else if strings.Contains(s.IP, "-") {
			// 范围段
			split := strings.Split(s.IP, "-")
			if len(split) < 2 {
				continue
			}
			start := split[0]
			end := split[1]
			intReqIP := utils.IpToInt(ip)
			if intReqIP < utils.IpToInt(start) || intReqIP > utils.IpToInt(end) {
				continue
			}
		} else {
			// IP
			if s.IP != ip {
				continue
			}
		}

		if s.Rule == nt.AccessRuleAllow {
			return conn
		}
		if s.Rule == nt.AccessRuleReject {
			_, _ = conn.Write([]byte("your access request was denied :(\n"))
			return nil
		}
	}

	return conn
}

func (sshd sshd) sessionHandler(sess ssh.Session) {
	defer func() {
		_ = sess.Close()
	}()

	rawReq := strings.Split(sess.User(), "@")
	username := rawReq[0]
	if len(rawReq) == 2 {
		assetname := rawReq[1]
		sess.Context().SetValue("publicKeyAsset", assetname)
	}
	remoteAddr := strings.Split(sess.RemoteAddr().String(), ":")[0]

	user, err := repository.UserRepository.FindByUsername(context.TODO(), username)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			_, _ = io.WriteString(sess, "您输入的账户或密码不正确.\n")
		} else {
			_, _ = io.WriteString(sess, err.Error())
		}
		return
	}

	if sess.PublicKey() != nil {
		publicKeyComment, ok := sess.Context().Value("publicKeyComment").(string)
		if publicKeyComment == "" && !ok {
			return
		}

		if user.Username != publicKeyComment {
			_, _ = io.WriteString(sess, "您输入的账户或密码不正确.\n")
			return
		}
	}

	// 判断是否需要进行双因素认证
	if user.TOTPSecret != "" && user.TOTPSecret != "-" && sess.PublicKey() == nil {
		sshd.gui.totpUI(sess, user, remoteAddr, username)
	} else {
		// 保存登录日志
		_ = service.UserService.SaveLoginLog(remoteAddr, "terminal", username, true, false, utils.LongUUID(), "")
		if sess.PublicKey() != nil {
			_, _ = io.WriteString(sess, "\n公钥认证成功\n")
		}
		sshd.gui.MainUI(sess, user)
	}
}

func (sshd sshd) publicKeyAuth(ctx ssh.Context, key ssh.PublicKey) bool {
	if len(config.GlobalCfg.Sshd.AuthorizedKeys) == 0 {
		return false
	}
	f, err := os.Open(config.GlobalCfg.Sshd.AuthorizedKeys)
	if err != nil {
		fmt.Printf("failed to open authorized_keys file: %v\n", err)
		return false
	}
	defer f.Close()

	keys := []struct {
		key     ssh.PublicKey
		comment string
	}{}
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		t := scanner.Text()
		if t == "" {
			continue
		}
		if strings.HasPrefix(t, "#") {
			continue
		}
		pk, c, _, _, err := ssh.ParseAuthorizedKey([]byte(t))
		if err != nil {
			continue
		}
		keys = append(keys, struct {
			key     ssh.PublicKey
			comment string
		}{
			key:     pk,
			comment: c,
		})
	}

	fmt.Printf("public key: %+v\n", keys)

	if err := scanner.Err(); err != nil {
		return false
	}

	// check if the public key is in the authorized_keys file
	for _, k := range keys {
		if ssh.KeysEqual(key, k.key) {
			ctx.SetValue("publicKeyComment", k.comment)
			return true
		}
	}

	return false
}

func (sshd sshd) Serve() {
	ssh.Handle(func(s ssh.Session) {
		_, _ = io.WriteString(s, branding.Hi)
		sshd.sessionHandler(s)
	})

	fmt.Printf("⇨ sshd server started on %v\n", config.GlobalCfg.Sshd.Addr)
	err := ssh.ListenAndServe(
		config.GlobalCfg.Sshd.Addr,
		nil,
		ssh.PublicKeyAuth(sshd.publicKeyAuth),
		ssh.PasswordAuth(sshd.passwordAuth),
		ssh.HostKeyFile(config.GlobalCfg.Sshd.Key),
		ssh.WrapConn(sshd.connCallback),
	)
	log.Fatal(fmt.Sprintf("启动sshd服务失败: %v", err.Error()))
}
