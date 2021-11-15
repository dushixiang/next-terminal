package api

import (
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net"
	"next-terminal/server/global/security"
	"path"
	"strings"
	"time"

	"next-terminal/server/config"
	"next-terminal/server/constant"
	"next-terminal/server/global/cache"
	"next-terminal/server/global/session"
	"next-terminal/server/guacd"
	"next-terminal/server/log"
	"next-terminal/server/model"
	"next-terminal/server/term"
	"next-terminal/server/totp"
	"next-terminal/server/utils"

	"github.com/gliderlabs/ssh"
	"github.com/manifoldco/promptui"
	"gorm.io/gorm"
)

func sessionHandler(sess *ssh.Session) {
	defer func() {
		_ = (*sess).Close()
	}()

	username := (*sess).User()
	remoteAddr := strings.Split((*sess).RemoteAddr().String(), ":")[0]

	user, err := userRepository.FindByUsername(username)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			_, _ = io.WriteString(*sess, "您输入的账户或密码不正确.\n")
		} else {
			_, _ = io.WriteString(*sess, err.Error())
		}
		return
	}

	// 判断是否需要进行双因素认证
	if user.TOTPSecret != "" && user.TOTPSecret != "-" {
		totpUI(sess, user, remoteAddr, username)
	} else {
		// 保存登录日志
		_ = SaveLoginLog(remoteAddr, "terminal", username, true, false, utils.UUID(), "")
		mainUI(sess, user)
	}
}

func totpUI(sess *ssh.Session, user model.User, remoteAddr string, username string) {

	validate := func(input string) error {
		if len(input) < 6 {
			return errors.New("双因素认证授权码必须为6个数字")
		}
		return nil
	}

	prompt := promptui.Prompt{
		Label:    "请输入双因素认证授权码",
		Validate: validate,
		Mask:     '*',
		Stdin:    *sess,
		Stdout:   *sess,
	}

	var success = false
	for i := 0; i < 5; i++ {
		result, err := prompt.Run()
		if err != nil {
			fmt.Printf("Prompt failed %v\n", err)
			return
		}
		loginFailCountKey := remoteAddr + username

		v, ok := cache.GlobalCache.Get(loginFailCountKey)
		if !ok {
			v = 1
		}
		count := v.(int)
		if count >= 5 {
			_, _ = io.WriteString(*sess, "登录失败次数过多，请等待30秒后再试\r\n")
			continue
		}
		if !totp.Validate(result, user.TOTPSecret) {
			count++
			println(count)
			cache.GlobalCache.Set(loginFailCountKey, count, time.Second*time.Duration(30))
			// 保存登录日志
			_ = SaveLoginLog(remoteAddr, "terminal", username, false, false, "", "双因素认证授权码不正确")
			_, _ = io.WriteString(*sess, "您输入的双因素认证授权码不匹配\r\n")
			continue
		}
		success = true
		break
	}

	if success {
		// 保存登录日志
		_ = SaveLoginLog(remoteAddr, "terminal", username, true, false, utils.UUID(), "")
		mainUI(sess, user)
	}
}

func mainUI(sess *ssh.Session, user model.User) {
	prompt := promptui.Select{
		Label:  "欢迎使用 Next Terminal，请选择您要使用的功能",
		Items:  []string{"我的资产", "退出系统"},
		Stdin:  *sess,
		Stdout: *sess,
	}

MainLoop:
	for {
		_, result, err := prompt.Run()
		if err != nil {
			fmt.Printf("Prompt failed %v\n", err)
			return
		}
		switch result {
		case "我的资产":
			AssetUI(sess, user)
		case "退出系统":
			break MainLoop
		}
	}
}

func AssetUI(sess *ssh.Session, user model.User) {
	assets, err := assetRepository.FindByProtocolAndUser(constant.SSH, user)
	if err != nil {
		return
	}

	quitItem := model.Asset{ID: "quit", Name: "返回上级菜单", Description: "这里是返回上级菜单的选项"}
	assets = append([]model.Asset{quitItem}, assets...)

	templates := &promptui.SelectTemplates{
		Label:    "{{ . }}?",
		Active:   "\U0001F336  {{ .Name | cyan }} ({{ .IP | red }}:{{ .Port | red }})",
		Inactive: "  {{ .Name | cyan }} ({{ .IP | red }}:{{ .Port | red }})",
		Selected: "\U0001F336  {{ .Name | red | cyan }}",
		Details: `
--------- 详细信息 ----------
{{ "名称:" | faint }}	{{ .Name }}
{{ "主机:" | faint }}	{{ .IP }}
{{ "端口:" | faint }}	{{ .Port }}
{{ "标签:" | faint }}	{{ .Tags }}
{{ "备注:" | faint }}	{{ .Description }}
`,
	}

	searcher := func(input string, index int) bool {
		asset := assets[index]
		name := strings.Replace(strings.ToLower(asset.Name), " ", "", -1)
		input = strings.Replace(strings.ToLower(input), " ", "", -1)

		return strings.Contains(name, input)
	}

	prompt := promptui.Select{
		Label:     "请选择您要访问的资产",
		Items:     assets,
		Templates: templates,
		Size:      4,
		Searcher:  searcher,
		Stdin:     *sess,
		Stdout:    *sess,
	}

AssetUILoop:
	for {
		i, _, err := prompt.Run()

		if err != nil {
			fmt.Printf("Prompt failed %v\n", err)
			return
		}

		chooseAssetId := assets[i].ID
		switch chooseAssetId {
		case "quit":
			break AssetUILoop
		default:
			if err := createSession(sess, assets[i].ID, user.ID); err != nil {
				_, _ = io.WriteString(*sess, err.Error()+"\r\n")
				return
			}
		}
	}

}

func createSession(sess *ssh.Session, assetId, creator string) (err error) {
	asset, err := assetRepository.FindById(assetId)
	if err != nil {
		return err
	}

	ClientIP := strings.Split((*sess).RemoteAddr().String(), ":")[0]

	s := &model.Session{
		ID:              utils.UUID(),
		AssetId:         asset.ID,
		Username:        asset.Username,
		Password:        asset.Password,
		PrivateKey:      asset.PrivateKey,
		Passphrase:      asset.Passphrase,
		Protocol:        asset.Protocol,
		IP:              asset.IP,
		Port:            asset.Port,
		Status:          constant.NoConnect,
		Creator:         creator,
		ClientIP:        ClientIP,
		Mode:            constant.Terminal,
		Upload:          "0",
		Download:        "0",
		Delete:          "0",
		Rename:          "0",
		StorageId:       "",
		AccessGatewayId: asset.AccessGatewayId,
	}

	if asset.AccountType == "credential" {
		credential, err := credentialRepository.FindById(asset.CredentialId)
		if err != nil {
			return nil
		}

		if credential.Type == constant.Custom {
			s.Username = credential.Username
			s.Password = credential.Password
		} else {
			s.Username = credential.Username
			s.PrivateKey = credential.PrivateKey
			s.Passphrase = credential.Passphrase
		}
	}

	if err := sessionRepository.Create(s); err != nil {
		return err
	}

	return handleAccessAsset(sess, s.ID)
}

func handleAccessAsset(sess *ssh.Session, sessionId string) (err error) {
	s, err := sessionRepository.FindByIdAndDecrypt(sessionId)
	if err != nil {
		return err
	}

	var (
		username   = s.Username
		password   = s.Password
		privateKey = s.PrivateKey
		passphrase = s.Passphrase
		ip         = s.IP
		port       = s.Port
	)

	if s.AccessGatewayId != "" && s.AccessGatewayId != "-" {
		g, err := accessGatewayService.GetGatewayAndReconnectById(s.AccessGatewayId)
		if err != nil {
			return errors.New("获取接入网关失败：" + err.Error())
		}
		if !g.Connected {
			return errors.New("接入网关不可用：" + g.Message)
		}
		exposedIP, exposedPort, err := g.OpenSshTunnel(s.ID, ip, port)
		if err != nil {
			return errors.New("开启SSH隧道失败：" + err.Error())
		}
		defer g.CloseSshTunnel(s.ID)
		ip = exposedIP
		port = exposedPort
	}

	pty, winCh, isPty := (*sess).Pty()
	if !isPty {
		return errors.New("No PTY requested.\n")
	}

	recording := ""
	property, err := propertyRepository.FindByName(guacd.EnableRecording)
	if err == nil && property.Value == "true" {
		recording = path.Join(config.GlobalCfg.Guacd.Recording, sessionId, "recording.cast")
	}

	nextTerminal, err := term.NewNextTerminal(ip, port, username, password, privateKey, passphrase, pty.Window.Height, pty.Window.Width, recording, pty.Term, false)
	if err != nil {
		return err
	}
	sshSession := nextTerminal.SshSession

	writer := NewWriter(sessionId, sess, nextTerminal.Recorder)

	sshSession.Stdout = writer
	sshSession.Stdin = *sess
	sshSession.Stderr = *sess

	if err := nextTerminal.RequestPty(pty.Term, pty.Window.Height, pty.Window.Width); err != nil {
		return err
	}

	if err := nextTerminal.Shell(); err != nil {
		return err
	}

	go func() {
		log.Debugf("开启窗口大小监控...")
		for win := range winCh {
			_ = sshSession.WindowChange(win.Height, win.Width)
		}
		log.Debugf("退出窗口大小监控")
		// ==== 修改数据库中的会话状态为已断开,修复用户直接关闭窗口时会话状态不正确的问题 ====
		CloseSessionById(sessionId, Normal, "用户正常退出")
		// ==== 修改数据库中的会话状态为已断开,修复用户直接关闭窗口时会话状态不正确的问题 ====
	}()

	// ==== 修改数据库中的会话状态为已连接 ====
	sessionForUpdate := model.Session{}
	sessionForUpdate.ID = sessionId
	sessionForUpdate.Status = constant.Connected
	sessionForUpdate.Recording = recording
	sessionForUpdate.ConnectedTime = utils.NowJsonTime()

	if sessionForUpdate.Recording == "" {
		// 未录屏时无需审计
		sessionForUpdate.Reviewed = true
	}

	if err := sessionRepository.UpdateById(&sessionForUpdate, sessionId); err != nil {
		return err
	}
	// ==== 修改数据库中的会话状态为已连接 ====

	nextSession := &session.Session{
		ID:           s.ID,
		Protocol:     s.Protocol,
		Mode:         s.Mode,
		NextTerminal: nextTerminal,
		Observer:     session.NewObserver(s.ID),
	}
	go nextSession.Observer.Run()
	session.GlobalSessionManager.Add <- nextSession

	if err := sshSession.Wait(); err != nil {
		return err
	}

	// ==== 修改数据库中的会话状态为已断开 ====
	CloseSessionById(sessionId, Normal, "用户正常退出")
	// ==== 修改数据库中的会话状态为已断开 ====

	return nil
}

func passwordAuth(ctx ssh.Context, pass string) bool {
	username := ctx.User()
	remoteAddr := strings.Split(ctx.RemoteAddr().String(), ":")[0]
	user, err := userRepository.FindByUsername(username)

	if err != nil {
		// 保存登录日志
		_ = SaveLoginLog(remoteAddr, "terminal", username, false, false, "", "账号或密码不正确")
		return false
	}

	if err := utils.Encoder.Match([]byte(user.Password), []byte(pass)); err != nil {
		// 保存登录日志
		_ = SaveLoginLog(remoteAddr, "terminal", username, false, false, "", "账号或密码不正确")
		return false
	}
	return true
}

func connCallback(ctx ssh.Context, conn net.Conn) net.Conn {
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

		if s.Rule == constant.AccessRuleAllow {
			return conn
		}
		if s.Rule == constant.AccessRuleReject {
			_, _ = conn.Write([]byte("your access request was denied :(\n"))
			return nil
		}
	}

	return conn
}

func Setup() {
	ssh.Handle(func(s ssh.Session) {
		_, _ = io.WriteString(s, fmt.Sprintf(constant.Banner, constant.Version))
		defer func() {
			if e, ok := recover().(error); ok {
				log.Fatal(e)
			}
		}()
		sessionHandler(&s)
	})

	fmt.Printf("⇨ sshd server started on %v\n", config.GlobalCfg.Sshd.Addr)
	err := ssh.ListenAndServe(
		config.GlobalCfg.Sshd.Addr,
		nil,
		ssh.PasswordAuth(passwordAuth),
		ssh.HostKeyFile(config.GlobalCfg.Sshd.Key),
		ssh.WrapConn(connCallback),
	)
	log.Fatal(fmt.Sprintf("启动sshd服务失败: %v", err.Error()))
}

func init() {
	if config.GlobalCfg.Sshd.Enable {
		go Setup()
	}
}

type Writer struct {
	sessionId string
	sess      *ssh.Session
	recorder  *term.Recorder
	rz        bool
	sz        bool
}

func NewWriter(sessionId string, sess *ssh.Session, recorder *term.Recorder) *Writer {
	return &Writer{sessionId: sessionId, sess: sess, recorder: recorder}
}

func (w *Writer) Write(p []byte) (n int, err error) {
	if w.recorder != nil {
		s := string(p)
		if !w.sz && !w.rz {
			// rz的开头字符
			hexData := hex.EncodeToString(p)
			if strings.Contains(hexData, "727a0d2a2a184230303030303030303030303030300d8a11") {
				w.sz = true
			} else if strings.Contains(hexData, "727a2077616974696e6720746f20726563656976652e2a2a184230313030303030303233626535300d8a11") {
				w.rz = true
			}
		}

		if w.sz {
			// sz 会以 OO 结尾
			if "OO" == s {
				w.sz = false
			}
		} else if w.rz {
			// rz 最后会显示 Received /home/xxx
			if strings.Contains(s, "Received") {
				w.rz = false
				// 把上传的文件名称也显示一下
				err := w.recorder.WriteData(s)
				if err != nil {
					return 0, err
				}
				sendObData(w.sessionId, s)
			}
		} else {
			err := w.recorder.WriteData(s)
			if err != nil {
				return 0, err
			}
			sendObData(w.sessionId, s)
		}
	}
	return (*w.sess).Write(p)
}

func sendObData(sessionId, s string) {
	nextSession := session.GlobalSessionManager.GetById(sessionId)
	if nextSession != nil {
		if nextSession.Observer != nil {
			obs := nextSession.Observer.All()
			for _, ob := range obs {
				_ = WriteMessage(ob.WebSocket, NewMessage(Data, s))
			}
		}
	}
}
