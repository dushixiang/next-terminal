package api

import (
	"bufio"
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

	"next-terminal/server/constant"
	"next-terminal/server/global/session"
	"next-terminal/server/guacd"
	"next-terminal/server/log"
	"next-terminal/server/model"
	"next-terminal/server/service"
	"next-terminal/server/utils"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
	"github.com/pkg/sftp"
	"gorm.io/gorm"
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
			if items[i].Mode == constant.Naive || items[i].Mode == constant.Terminal {
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

	s := model.Session{}
	s.ID = sessionId
	s.Status = constant.Connected
	s.ConnectedTime = utils.NowJsonTime()

	if err := sessionRepository.UpdateById(&s, sessionId); err != nil {
		return err
	}

	o, err := sessionRepository.FindById(sessionId)
	if err != nil {
		return err
	}
	asset, err := assetRepository.FindById(o.AssetId)
	if err != nil {
		return err
	}
	if !asset.Active {
		asset.Active = true
		_ = assetRepository.UpdateById(&asset, asset.ID)
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
	nextSession := session.GlobalSessionManager.GetById(sessionId)
	if nextSession != nil {
		log.Debugf("[%v] 会话关闭，原因：%v", sessionId, reason)
		WriteCloseMessage(nextSession.WebSocket, nextSession.Mode, code, reason)

		if nextSession.Observer != nil {
			obs := nextSession.Observer.All()
			for _, ob := range obs {
				WriteCloseMessage(ob.WebSocket, ob.Mode, code, reason)
				log.Debugf("[%v] 强制踢出会话的观察者: %v", sessionId, ob.ID)
			}
		}
	}
	session.GlobalSessionManager.Del <- sessionId

	DisDBSess(sessionId, code, reason)
}

func WriteCloseMessage(ws *websocket.Conn, mode string, code int, reason string) {
	switch mode {
	case constant.Guacd:
		if ws != nil {
			err := guacd.NewInstruction("error", "", strconv.Itoa(code))
			_ = ws.WriteMessage(websocket.TextMessage, []byte(err.String()))
			disconnect := guacd.NewInstruction("disconnect")
			_ = ws.WriteMessage(websocket.TextMessage, []byte(disconnect.String()))
		}
	case constant.Naive:
		if ws != nil {
			msg := `0` + reason
			_ = ws.WriteMessage(websocket.TextMessage, []byte(msg))
		}
	case constant.Terminal:
		// 这里是关闭观察者的ssh会话
		if ws != nil {
			msg := `0` + reason
			_ = ws.WriteMessage(websocket.TextMessage, []byte(msg))
		}
	}
}

func DisDBSess(sessionId string, code int, reason string) {
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

	ss := model.Session{}
	ss.ID = sessionId
	ss.Status = constant.Disconnected
	ss.DisconnectedTime = utils.NowJsonTime()
	ss.Code = code
	ss.Message = reason
	ss.Password = "-"
	ss.PrivateKey = "-"
	ss.Passphrase = "-"

	_ = sessionRepository.UpdateById(&ss, sessionId)
}

func SessionResizeEndpoint(c echo.Context) error {
	width := c.QueryParam("width")
	height := c.QueryParam("height")
	sessionId := c.Param("id")

	if len(width) == 0 || len(height) == 0 {
		return errors.New("参数异常")
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

	asset, err := assetRepository.FindById(assetId)
	if err != nil {
		return err
	}

	var (
		upload     = "1"
		download   = "1"
		_delete    = "1"
		rename     = "1"
		edit       = "1"
		fileSystem = "1"
	)
	if asset.Owner != user.ID && constant.TypeUser == user.Type {
		// 普通用户访问非自己创建的资产需要校验权限
		resourceSharers, err := resourceSharerRepository.FindByResourceIdAndUserId(assetId, user.ID)
		if err != nil {
			return err
		}
		if len(resourceSharers) == 0 {
			return errors.New("您没有权限访问此资产")
		}
		strategyId := resourceSharers[0].StrategyId
		if strategyId != "" {
			strategy, err := strategyRepository.FindById(strategyId)
			if err != nil {
				if !errors.Is(gorm.ErrRecordNotFound, err) {
					return err
				}
			} else {
				upload = strategy.Upload
				download = strategy.Download
				_delete = strategy.Delete
				rename = strategy.Rename
				edit = strategy.Edit
			}
		}
	}

	var storageId = ""
	if constant.RDP == asset.Protocol {
		attr, err := assetRepository.FindAssetAttrMapByAssetId(assetId)
		if err != nil {
			return err
		}
		if "true" == attr[guacd.EnableDrive] {
			fileSystem = "1"
			storageId = attr[guacd.DrivePath]
			if storageId == "" {
				storageId = user.ID
			}
		} else {
			fileSystem = "0"
		}
	}

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
		Creator:         user.ID,
		ClientIP:        c.RealIP(),
		Mode:            mode,
		Upload:          upload,
		Download:        download,
		Delete:          _delete,
		Rename:          rename,
		Edit:            edit,
		StorageId:       storageId,
		AccessGatewayId: asset.AccessGatewayId,
	}

	if asset.AccountType == "credential" {
		credential, err := credentialRepository.FindById(asset.CredentialId)
		if err != nil {
			return err
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

	return Success(c, echo.Map{
		"id":         s.ID,
		"upload":     s.Upload,
		"download":   s.Download,
		"delete":     s.Delete,
		"rename":     s.Rename,
		"edit":       s.Edit,
		"storageId":  s.StorageId,
		"fileSystem": fileSystem,
	})
}

func SessionUploadEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	s, err := sessionRepository.FindById(sessionId)
	if err != nil {
		return err
	}
	if s.Upload != "1" {
		return errors.New("禁止操作")
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

	if "ssh" == s.Protocol {
		nextSession := session.GlobalSessionManager.GetById(sessionId)
		if nextSession == nil {
			return errors.New("获取会话失败")
		}

		sftpClient := nextSession.NextTerminal.SftpClient
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
	} else if "rdp" == s.Protocol {
		return StorageUpload(c, file, s.StorageId)
	}

	return err
}

func SessionEditEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	s, err := sessionRepository.FindById(sessionId)
	if err != nil {
		return err
	}
	if s.Edit != "1" {
		return errors.New("禁止操作")
	}
	file := c.FormValue("file")
	fileContent := c.FormValue("fileContent")

	if "ssh" == s.Protocol {
		nextSession := session.GlobalSessionManager.GetById(sessionId)
		if nextSession == nil {
			return errors.New("获取会话失败")
		}

		sftpClient := nextSession.NextTerminal.SftpClient
		dstFile, err := sftpClient.OpenFile(file, os.O_WRONLY|os.O_CREATE|os.O_TRUNC)
		if err != nil {
			return err
		}
		defer dstFile.Close()
		write := bufio.NewWriter(dstFile)
		if _, err := write.WriteString(fileContent); err != nil {
			return err
		}
		if err := write.Flush(); err != nil {
			return err
		}
		return Success(c, nil)
	} else if "rdp" == s.Protocol {
		return StorageEdit(c, file, fileContent, s.StorageId)
	}
	return err
}

func SessionDownloadEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	s, err := sessionRepository.FindById(sessionId)
	if err != nil {
		return err
	}
	if s.Download != "1" {
		return errors.New("禁止操作")
	}
	remoteFile := c.QueryParam("file")
	// 获取带后缀的文件名称
	filenameWithSuffix := path.Base(remoteFile)
	if "ssh" == s.Protocol {
		nextSession := session.GlobalSessionManager.GetById(sessionId)
		if nextSession == nil {
			return errors.New("获取会话失败")
		}

		dstFile, err := nextSession.NextTerminal.SftpClient.Open(remoteFile)
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
	} else if "rdp" == s.Protocol {
		storageId := s.StorageId
		return StorageDownload(c, remoteFile, storageId)
	}

	return err
}

func SessionLsEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	s, err := sessionRepository.FindByIdAndDecrypt(sessionId)
	if err != nil {
		return err
	}

	remoteDir := c.FormValue("dir")
	if "ssh" == s.Protocol {
		nextSession := session.GlobalSessionManager.GetById(sessionId)
		if nextSession == nil {
			return errors.New("获取会话失败")
		}

		if nextSession.NextTerminal.SftpClient == nil {
			sftpClient, err := sftp.NewClient(nextSession.NextTerminal.SshClient)
			if err != nil {
				log.Errorf("创建sftp客户端失败：%v", err.Error())
				return err
			}
			nextSession.NextTerminal.SftpClient = sftpClient
		}

		fileInfos, err := nextSession.NextTerminal.SftpClient.ReadDir(remoteDir)
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
	} else if "rdp" == s.Protocol {
		storageId := s.StorageId
		return StorageLs(c, remoteDir, storageId)
	}

	return errors.New("当前协议不支持此操作")
}

func SessionMkDirEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	s, err := sessionRepository.FindById(sessionId)
	if err != nil {
		return err
	}
	if s.Upload != "1" {
		return errors.New("禁止操作")
	}
	remoteDir := c.QueryParam("dir")
	if "ssh" == s.Protocol {
		nextSession := session.GlobalSessionManager.GetById(sessionId)
		if nextSession == nil {
			return errors.New("获取会话失败")
		}
		if err := nextSession.NextTerminal.SftpClient.Mkdir(remoteDir); err != nil {
			return err
		}
		return Success(c, nil)
	} else if "rdp" == s.Protocol {
		return StorageMkDir(c, remoteDir, s.StorageId)
	}
	return errors.New("当前协议不支持此操作")
}

func SessionRmEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	s, err := sessionRepository.FindById(sessionId)
	if err != nil {
		return err
	}
	if s.Delete != "1" {
		return errors.New("禁止操作")
	}
	// 文件夹或者文件
	file := c.FormValue("file")
	if "ssh" == s.Protocol {
		nextSession := session.GlobalSessionManager.GetById(sessionId)
		if nextSession == nil {
			return errors.New("获取会话失败")
		}

		sftpClient := nextSession.NextTerminal.SftpClient

		stat, err := sftpClient.Stat(file)
		if err != nil {
			return err
		}

		if stat.IsDir() {
			fileInfos, err := sftpClient.ReadDir(file)
			if err != nil {
				return err
			}

			for i := range fileInfos {
				if err := sftpClient.Remove(path.Join(file, fileInfos[i].Name())); err != nil {
					return err
				}
			}

			if err := sftpClient.RemoveDirectory(file); err != nil {
				return err
			}
		} else {
			if err := sftpClient.Remove(file); err != nil {
				return err
			}
		}

		return Success(c, nil)
	} else if "rdp" == s.Protocol {
		return StorageRm(c, file, s.StorageId)
	}

	return errors.New("当前协议不支持此操作")
}

func SessionRenameEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	s, err := sessionRepository.FindById(sessionId)
	if err != nil {
		return err
	}
	if s.Rename != "1" {
		return errors.New("禁止操作")
	}
	oldName := c.QueryParam("oldName")
	newName := c.QueryParam("newName")
	if "ssh" == s.Protocol {
		nextSession := session.GlobalSessionManager.GetById(sessionId)
		if nextSession == nil {
			return errors.New("获取会话失败")
		}

		sftpClient := nextSession.NextTerminal.SftpClient

		if err := sftpClient.Rename(oldName, newName); err != nil {
			return err
		}

		return Success(c, nil)
	} else if "rdp" == s.Protocol {
		return StorageRename(c, oldName, newName, s.StorageId)
	}
	return errors.New("当前协议不支持此操作")
}

func SessionRecordingEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	s, err := sessionRepository.FindById(sessionId)
	if err != nil {
		return err
	}

	var recording string
	if s.Mode == constant.Naive || s.Mode == constant.Terminal {
		recording = s.Recording
	} else {
		recording = s.Recording + "/recording"
	}

	log.Debugf("读取录屏文件：%v,是否存在: %v, 是否为文件: %v", recording, utils.FileExists(recording), utils.IsFile(recording))
	return c.File(recording)
}

func SessionGetEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	s, err := sessionRepository.FindById(sessionId)
	if err != nil {
		return err
	}
	return Success(c, s)
}

func SessionStatsEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	s, err := sessionRepository.FindByIdAndDecrypt(sessionId)
	if err != nil {
		return err
	}

	if "ssh" != s.Protocol {
		return Fail(c, -1, "不支持当前协议")
	}

	nextSession := session.GlobalSessionManager.GetById(sessionId)
	if nextSession == nil {
		return errors.New("获取会话失败")
	}
	sshClient := nextSession.NextTerminal.SshClient
	stats, err := GetAllStats(sshClient)
	if err != nil {
		return err
	}
	return Success(c, stats)
}
