package api

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"strconv"
	"strings"
	"sync"

	"next-terminal/pkg/constant"
	"next-terminal/pkg/global"
	"next-terminal/pkg/log"
	"next-terminal/pkg/service"
	"next-terminal/server/model"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
	"github.com/pkg/sftp"
)

func SessionPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	status := c.QueryParam("status")
	userId := c.QueryParam("userId")
	clientIp := c.QueryParam("clientIp")
	assetId := c.QueryParam("assetId")
	protocol := c.QueryParam("protocol")

	items, total, err := sessionRepository.Find(pageIndex, pageSize, status, userId, clientIp, assetId, protocol)

	if err != nil {
		return err
	}

	for i := 0; i < len(items); i++ {
		if status == constant.Disconnected && len(items[i].Recording) > 0 {

			var recording string
			if items[i].Mode == constant.Naive {
				recording = items[i].Recording
			} else {
				recording = items[i].Recording + "/recording"
			}

			if utils.FileExists(recording) {
				items[i].Recording = "1"
			} else {
				items[i].Recording = "0"
			}
		} else {
			items[i].Recording = "0"
		}
	}

	return Success(c, H{
		"total": total,
		"items": items,
	})
}

func SessionDeleteEndpoint(c echo.Context) error {
	sessionIds := c.Param("id")
	split := strings.Split(sessionIds, ",")
	err := sessionRepository.DeleteByIds(split)
	if err != nil {
		return err
	}

	return Success(c, nil)
}

func SessionConnectEndpoint(c echo.Context) error {
	sessionId := c.Param("id")

	session := model.Session{}
	session.ID = sessionId
	session.Status = constant.Connected
	session.ConnectedTime = utils.NowJsonTime()

	if err := sessionRepository.UpdateById(&session, sessionId); err != nil {
		return err
	}
	return Success(c, nil)
}

func SessionDisconnectEndpoint(c echo.Context) error {
	sessionIds := c.Param("id")

	split := strings.Split(sessionIds, ",")
	for i := range split {
		CloseSessionById(split[i], ForcedDisconnect, "管理员强制关闭了此会话")
	}
	return Success(c, nil)
}

var mutex sync.Mutex

func CloseSessionById(sessionId string, code int, reason string) {
	mutex.Lock()
	defer mutex.Unlock()
	observable, _ := global.Store.Get(sessionId)
	if observable != nil {
		log.Debugf("会话%v创建者退出，原因：%v", sessionId, reason)
		observable.Subject.Close(code, reason)

		for i := 0; i < len(observable.Observers); i++ {
			observable.Observers[i].Close(code, reason)
			log.Debugf("强制踢出会话%v的观察者", sessionId)
		}
	}
	global.Store.Del(sessionId)

	s, err := sessionRepository.FindById(sessionId)
	if err != nil {
		return
	}

	if s.Status == constant.Disconnected {
		return
	}

	if s.Status == constant.Connecting {
		// 会话还未建立成功，无需保留数据
		_ = sessionRepository.DeleteById(sessionId)
		return
	}

	session := model.Session{}
	session.ID = sessionId
	session.Status = constant.Disconnected
	session.DisconnectedTime = utils.NowJsonTime()
	session.Code = code
	session.Message = reason
	session.Password = "-"
	session.PrivateKey = "-"
	session.Passphrase = "-"

	_ = sessionRepository.UpdateById(&session, sessionId)
}

func SessionResizeEndpoint(c echo.Context) error {
	width := c.QueryParam("width")
	height := c.QueryParam("height")
	sessionId := c.Param("id")

	if len(width) == 0 || len(height) == 0 {
		panic("参数异常")
	}

	intWidth, _ := strconv.Atoi(width)

	intHeight, _ := strconv.Atoi(height)

	if err := sessionRepository.UpdateWindowSizeById(intWidth, intHeight, sessionId); err != nil {
		return err
	}
	return Success(c, "")
}

func SessionCreateEndpoint(c echo.Context) error {
	assetId := c.QueryParam("assetId")
	mode := c.QueryParam("mode")

	if mode == constant.Naive {
		mode = constant.Naive
	} else {
		mode = constant.Guacd
	}

	user, _ := GetCurrentAccount(c)

	if constant.TypeUser == user.Type {
		// 检测是否有访问权限
		assetIds, err := resourceSharerRepository.FindAssetIdsByUserId(user.ID)
		if err != nil {
			return err
		}

		if !utils.Contains(assetIds, assetId) {
			return errors.New("您没有权限访问此资产")
		}
	}

	asset, err := assetRepository.FindById(assetId)
	if err != nil {
		return err
	}

	session := &model.Session{
		ID:         utils.UUID(),
		AssetId:    asset.ID,
		Username:   asset.Username,
		Password:   asset.Password,
		PrivateKey: asset.PrivateKey,
		Passphrase: asset.Passphrase,
		Protocol:   asset.Protocol,
		IP:         asset.IP,
		Port:       asset.Port,
		Status:     constant.NoConnect,
		Creator:    user.ID,
		ClientIP:   c.RealIP(),
		Mode:       mode,
	}

	if asset.AccountType == "credential" {
		credential, err := credentialRepository.FindById(asset.CredentialId)
		if err != nil {
			return err
		}

		if credential.Type == constant.Custom {
			session.Username = credential.Username
			session.Password = credential.Password
		} else {
			session.Username = credential.Username
			session.PrivateKey = credential.PrivateKey
			session.Passphrase = credential.Passphrase
		}
	}

	if err := sessionRepository.Create(session); err != nil {
		return err
	}

	return Success(c, echo.Map{"id": session.ID})
}

func SessionUploadEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	session, err := sessionRepository.FindById(sessionId)
	if err != nil {
		return err
	}
	file, err := c.FormFile("file")
	if err != nil {
		return err
	}

	filename := file.Filename
	src, err := file.Open()
	if err != nil {
		return err
	}

	remoteDir := c.QueryParam("dir")
	remoteFile := path.Join(remoteDir, filename)

	if "ssh" == session.Protocol {
		tun, ok := global.Store.Get(sessionId)
		if !ok {
			return errors.New("获取sftp客户端失败")
		}

		sftpClient := tun.Subject.NextTerminal.SftpClient
		// 文件夹不存在时自动创建文件夹
		if _, err := sftpClient.Stat(remoteDir); os.IsNotExist(err) {
			if err := sftpClient.MkdirAll(remoteDir); err != nil {
				return err
			}
		}

		dstFile, err := sftpClient.Create(remoteFile)
		if err != nil {
			return err
		}
		defer dstFile.Close()

		if _, err = io.Copy(dstFile, src); err != nil {
			return err
		}
		return Success(c, nil)
	}

	return err
}

func SessionDownloadEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	session, err := sessionRepository.FindById(sessionId)
	if err != nil {
		return err
	}
	//remoteDir := c.Query("dir")
	remoteFile := c.QueryParam("file")
	// 获取带后缀的文件名称
	filenameWithSuffix := path.Base(remoteFile)
	if "ssh" == session.Protocol {
		tun, ok := global.Store.Get(sessionId)
		if !ok {
			return errors.New("获取sftp客户端失败")
		}

		dstFile, err := tun.Subject.NextTerminal.SftpClient.Open(remoteFile)
		if err != nil {
			return err
		}

		defer dstFile.Close()
		c.Response().Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filenameWithSuffix))

		var buff bytes.Buffer
		if _, err := dstFile.WriteTo(&buff); err != nil {
			return err
		}

		return c.Stream(http.StatusOK, echo.MIMEOctetStream, bytes.NewReader(buff.Bytes()))
	}

	return err
}

func SessionLsEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	session, err := sessionRepository.FindByIdAndDecrypt(sessionId)
	if err != nil {
		return err
	}
	remoteDir := c.QueryParam("dir")
	if "ssh" == session.Protocol {
		tun, ok := global.Store.Get(sessionId)
		if !ok {
			return errors.New("获取sftp客户端失败")
		}

		if tun.Subject.NextTerminal == nil {
			nextTerminal, err := CreateNextTerminalBySession(session)
			if err != nil {
				return err
			}
			tun.Subject.NextTerminal = nextTerminal
		}

		if tun.Subject.NextTerminal.SftpClient == nil {
			sftpClient, err := sftp.NewClient(tun.Subject.NextTerminal.SshClient)
			if err != nil {
				log.Errorf("创建sftp客户端失败：%v", err.Error())
				return err
			}
			tun.Subject.NextTerminal.SftpClient = sftpClient
		}

		fileInfos, err := tun.Subject.NextTerminal.SftpClient.ReadDir(remoteDir)
		if err != nil {
			return err
		}

		var files = make([]service.File, 0)
		for i := range fileInfos {

			// 忽略隐藏文件
			if strings.HasPrefix(fileInfos[i].Name(), ".") {
				continue
			}

			file := service.File{
				Name:    fileInfos[i].Name(),
				Path:    path.Join(remoteDir, fileInfos[i].Name()),
				IsDir:   fileInfos[i].IsDir(),
				Mode:    fileInfos[i].Mode().String(),
				IsLink:  fileInfos[i].Mode()&os.ModeSymlink == os.ModeSymlink,
				ModTime: utils.NewJsonTime(fileInfos[i].ModTime()),
				Size:    fileInfos[i].Size(),
			}

			files = append(files, file)
		}

		return Success(c, files)
	}

	return errors.New("当前协议不支持此操作")
}

func SafetyRuleTrigger(c echo.Context) {
	log.Warnf("IP %v 尝试进行攻击，请ban掉此IP", c.RealIP())
	security := model.AccessSecurity{
		ID:     utils.UUID(),
		Source: "安全规则触发",
		IP:     c.RealIP(),
		Rule:   constant.AccessRuleReject,
	}

	_ = accessSecurityRepository.Create(&security)
}

func SessionMkDirEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	session, err := sessionRepository.FindById(sessionId)
	if err != nil {
		return err
	}
	remoteDir := c.QueryParam("dir")
	if "ssh" == session.Protocol {
		tun, ok := global.Store.Get(sessionId)
		if !ok {
			return errors.New("获取sftp客户端失败")
		}
		if err := tun.Subject.NextTerminal.SftpClient.Mkdir(remoteDir); err != nil {
			return err
		}
		return Success(c, nil)
	}
	return errors.New("当前协议不支持此操作")
}

func SessionRmEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	session, err := sessionRepository.FindById(sessionId)
	if err != nil {
		return err
	}
	// 文件夹或者文件
	key := c.QueryParam("key")
	if "ssh" == session.Protocol {
		tun, ok := global.Store.Get(sessionId)
		if !ok {
			return errors.New("获取sftp客户端失败")
		}

		sftpClient := tun.Subject.NextTerminal.SftpClient

		stat, err := sftpClient.Stat(key)
		if err != nil {
			return err
		}

		if stat.IsDir() {
			fileInfos, err := sftpClient.ReadDir(key)
			if err != nil {
				return err
			}

			for i := range fileInfos {
				if err := sftpClient.Remove(path.Join(key, fileInfos[i].Name())); err != nil {
					return err
				}
			}

			if err := sftpClient.RemoveDirectory(key); err != nil {
				return err
			}
		} else {
			if err := sftpClient.Remove(key); err != nil {
				return err
			}
		}

		return Success(c, nil)
	}

	return errors.New("当前协议不支持此操作")
}

func SessionRenameEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	session, err := sessionRepository.FindById(sessionId)
	if err != nil {
		return err
	}
	oldName := c.QueryParam("oldName")
	newName := c.QueryParam("newName")
	if "ssh" == session.Protocol {
		tun, ok := global.Store.Get(sessionId)
		if !ok {
			return errors.New("获取sftp客户端失败")
		}

		sftpClient := tun.Subject.NextTerminal.SftpClient

		if err := sftpClient.Rename(oldName, newName); err != nil {
			return err
		}

		return Success(c, nil)
	}
	return errors.New("当前协议不支持此操作")
}

func SessionRecordingEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	session, err := sessionRepository.FindById(sessionId)
	if err != nil {
		return err
	}

	var recording string
	if session.Mode == constant.Naive {
		recording = session.Recording
	} else {
		recording = session.Recording + "/recording"
	}

	log.Debugf("读取录屏文件：%v,是否存在: %v, 是否为文件: %v", recording, utils.FileExists(recording), utils.IsFile(recording))
	return c.File(recording)
}

func SessionStatsEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	session, err := sessionRepository.FindByIdAndDecrypt(sessionId)
	if err != nil {
		return err
	}

	if "ssh" != session.Protocol {
		return Fail(c, -1, "不支持当前协议")
	}

	tun, ok := global.Store.Get(sessionId)
	if !ok {
		return errors.New("获取隧道失败")
	}

	if tun.Subject.NextTerminal == nil {
		nextTerminal, err := CreateNextTerminalBySession(session)
		if err != nil {
			return err
		}
		tun.Subject.NextTerminal = nextTerminal
	}

	sshClient := tun.Subject.NextTerminal.SshClient
	stats, err := GetAllStats(sshClient)
	if err != nil {
		return err
	}
	return Success(c, stats)
}
