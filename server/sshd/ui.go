package sshd

import (
	"context"
	"errors"
	"fmt"
	"io"
	"path"
	"sort"
	"strings"

	"next-terminal/server/api"
	"next-terminal/server/branding"
	"next-terminal/server/common"
	"next-terminal/server/common/guacamole"
	"next-terminal/server/common/nt"
	"next-terminal/server/common/term"
	"next-terminal/server/config"
	"next-terminal/server/global/cache"
	"next-terminal/server/global/session"
	"next-terminal/server/log"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/service"
	"next-terminal/server/utils"

	"github.com/gliderlabs/ssh"
	"github.com/manifoldco/promptui"
)

type Gui struct {
}

func (gui Gui) MainUI(sess ssh.Session, user model.User) {
	prompt := promptui.Select{
		Label:  "欢迎使用 " + branding.Name + "，请选择您要使用的功能",
		Items:  []string{"我的资产", "退出系统"},
		Stdin:  sess,
		Stdout: sess,
	}

MainLoop:
	for {
		var (
			result string
			err    error
		)
		publicKeyAsset, ok := sess.Context().Value("publicKeyAsset").(string)
		if ok && publicKeyAsset != "" {
			gui.AssetUI(sess, user)
			return
		} else {
			_, result, err = prompt.Run()
		}
		if err != nil {
			fmt.Printf("Prompt failed %v\n", err)
			return
		}
		switch result {
		case "我的资产":
			gui.AssetUI(sess, user)
		case "退出系统":
			break MainLoop
		}
	}
}

func (gui Gui) AssetUI(sess ssh.Session, user model.User) {
	var (
		selectedAssetId string
		err             error
	)
	publicKeyAsset, ok := sess.Context().Value("publicKeyAsset").(string)
	if ok && publicKeyAsset != "" {
		asset, err := service.WorkerService.FindMyAssetByName(publicKeyAsset, nt.SSH, user.ID)
		if err != nil || asset.ID == "" {
			sess.Write([]byte("未找到对应资产\n"))
			return
		}
		selectedAssetId = asset.ID
	}
	assetsNoSort, err := service.WorkerService.FindMyAsset("", nt.SSH, "", user.ID, "", "")
	if err != nil {
		return
	}

	assets := _AssetsSortByName(assetsNoSort)
	sort.Sort(assets)

	for i := range assets {
		assets[i].IP = ""
		assets[i].Port = 0
	}

	quitItem := model.AssetForPage{ID: "quit", Name: "返回上级菜单", Description: "这里是返回上级菜单的选项"}
	assets = append([]model.AssetForPage{quitItem}, assets...)

	templates := &promptui.SelectTemplates{
		Label:    "{{ . }}?",
		Active:   "\U0001F336  {{ .Name | cyan }}",
		Inactive: "  {{ .Name | cyan }}",
		Selected: "\U0001F336  {{ .Name | red | cyan }}",
		Details: `
--------- 详细信息 ----------
{{ "名称:" | faint }}	{{ .Name }}
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
		Size:      15,
		Searcher:  searcher,
		Stdin:     sess,
		Stdout:    sess,
	}

AssetUILoop:
	for {
		var (
			err           error
			i             int
			chooseAssetId string
		)
		if len(selectedAssetId) != 0 {
			chooseAssetId = selectedAssetId
		} else {
			i, _, err = prompt.Run()
			if err != nil {
				fmt.Printf("Prompt failed %v\n", err)
				return
			}
			chooseAssetId = assets[i].ID
		}

		switch chooseAssetId {
		case "quit":
			break AssetUILoop
		default:
			if err := gui.createSession(sess, chooseAssetId, user.ID); err != nil {
				_, _ = io.WriteString(sess, err.Error()+"\r\n")
				return
			}
		}
	}
}

func (gui Gui) createSession(sess ssh.Session, assetId, creator string) (err error) {
	asset, err := repository.AssetRepository.FindById(context.TODO(), assetId)
	if err != nil {
		return err
	}

	ClientIP := strings.Split((sess).RemoteAddr().String(), ":")[0]

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
		Status:          nt.NoConnect,
		Creator:         creator,
		ClientIP:        ClientIP,
		Mode:            nt.Terminal,
		Upload:          "0",
		Download:        "0",
		Delete:          "0",
		Rename:          "0",
		StorageId:       "",
		AccessGatewayId: asset.AccessGatewayId,
	}

	if asset.AccountType == "credential" {
		credential, err := repository.CredentialRepository.FindById(context.TODO(), asset.CredentialId)
		if err != nil {
			return nil
		}

		if credential.Type == nt.Custom {
			s.Username = credential.Username
			s.Password = credential.Password
		} else {
			s.Username = credential.Username
			s.PrivateKey = credential.PrivateKey
			s.Passphrase = credential.Passphrase
		}
	}

	if err := repository.SessionRepository.Create(context.TODO(), s); err != nil {
		return err
	}

	return gui.handleAccessAsset(sess, s.ID)
}

func (gui Gui) handleAccessAsset(sess ssh.Session, sessionId string) (err error) {
	s, err := service.SessionService.FindByIdAndDecrypt(context.TODO(), sessionId)
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
		g, err := service.GatewayService.GetGatewayById(s.AccessGatewayId)
		if err != nil {
			return errors.New("获取接入网关失败：" + err.Error())
		}

		defer g.CloseSshTunnel(s.ID)
		exposedIP, exposedPort, err := g.OpenSshTunnel(s.ID, ip, port)
		if err != nil {
			return errors.New("开启SSH隧道失败：" + err.Error())
		}
		ip = exposedIP
		port = exposedPort
	}

	pty, winCh, isPty := (sess).Pty()
	if !isPty {
		return errors.New("No PTY requested.\n")
	}

	recording := ""
	property, err := repository.PropertyRepository.FindByName(context.TODO(), guacamole.EnableRecording)
	if err == nil && property.Value == "true" {
		recording = path.Join(config.GlobalCfg.Guacd.Recording, sessionId, "recording.cast")
	}

	nextTerminal, err := term.NewNextTerminal(ip, port, username, password, privateKey, passphrase, pty.Window.Height, pty.Window.Width, recording, pty.Term, false)
	if err != nil {
		return err
	}
	sshSession := nextTerminal.SshSession

	writer := NewWriter(sessionId, sess, nextTerminal)

	sshSession.Stdout = writer
	sshSession.Stdin = writer
	sshSession.Stderr = writer

	if err := nextTerminal.RequestPty(pty.Term, pty.Window.Height, pty.Window.Width); err != nil {
		return err
	}

	if err := nextTerminal.Shell(); err != nil {
		return err
	}

	go func() {
		log.Debug("开启窗口大小监控...")
		for win := range winCh {
			_ = sshSession.WindowChange(win.Height, win.Width)
		}
		log.Debug("退出窗口大小监控")
		// ==== 修改数据库中的会话状态为已断开,修复用户直接关闭窗口时会话状态不正确的问题 ====
		service.SessionService.CloseSessionById(sessionId, api.Normal, "用户正常退出")
		// ==== 修改数据库中的会话状态为已断开,修复用户直接关闭窗口时会话状态不正确的问题 ====
	}()

	// ==== 修改数据库中的会话状态为已连接 ====
	sessionForUpdate := model.Session{}
	sessionForUpdate.ID = sessionId
	sessionForUpdate.Status = nt.Connected
	sessionForUpdate.Recording = recording
	sessionForUpdate.ConnectedTime = common.NowJsonTime()

	if sessionForUpdate.Recording == "" {
		// 未录屏时无需审计
		sessionForUpdate.Reviewed = true
	}

	if err := repository.SessionRepository.UpdateById(context.TODO(), &sessionForUpdate, sessionId); err != nil {
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
	session.GlobalSessionManager.Add(nextSession)

	if err := sshSession.Wait(); err != nil {
		return err
	}

	// ==== 修改数据库中的会话状态为已断开 ====
	service.SessionService.CloseSessionById(sessionId, api.Normal, "用户正常退出")
	// ==== 修改数据库中的会话状态为已断开 ====

	return nil
}

func (gui Gui) totpUI(sess ssh.Session, user model.User, remoteAddr string, username string) {

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
		Stdin:    sess,
		Stdout:   sess,
	}

	var success = false
	for i := 0; i < 5; i++ {
		result, err := prompt.Run()
		if err != nil {
			fmt.Printf("Prompt failed %v\n", err)
			return
		}
		loginFailCountKey := remoteAddr + username

		v, ok := cache.LoginFailedKeyManager.Get(loginFailCountKey)
		if !ok {
			v = 1
		}
		count := v.(int)
		if count >= 5 {
			_, _ = io.WriteString(sess, "登录失败次数过多，请等待5分钟后再试\r\n")
			continue
		}
		if !common.Validate(result, user.TOTPSecret) {
			count++
			println(count)
			cache.LoginFailedKeyManager.Set(loginFailCountKey, count, cache.LoginLockExpiration)
			// 保存登录日志
			_ = service.UserService.SaveLoginLog(remoteAddr, "terminal", username, false, false, "", "双因素认证授权码不正确")
			_, _ = io.WriteString(sess, "您输入的双因素认证授权码不匹配\r\n")
			continue
		}
		success = true
		break
	}

	if success {
		// 保存登录日志
		_ = service.UserService.SaveLoginLog(remoteAddr, "terminal", username, true, false, utils.UUID(), "")
		gui.MainUI(sess, user)
	}
}
