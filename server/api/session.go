package api

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"next-terminal/server/common"
	"next-terminal/server/common/maps"
	"next-terminal/server/common/nt"
	"next-terminal/server/global/session"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/service"
	"next-terminal/server/utils"
	"os"
	"path"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/pkg/sftp"
)

type SessionApi struct{}

func (api SessionApi) SessionPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	status := c.QueryParam("status")
	userId := c.QueryParam("userId")
	clientIp := c.QueryParam("clientIp")
	assetId := c.QueryParam("assetId")
	protocol := c.QueryParam("protocol")
	reviewed := c.QueryParam("reviewed")

	items, total, err := repository.SessionRepository.Find(context.TODO(), pageIndex, pageSize, status, userId, clientIp, assetId, protocol, reviewed)

	if err != nil {
		return err
	}

	for i := 0; i < len(items); i++ {
		if status == nt.Disconnected && len(items[i].Recording) > 0 {

			var recording string
			if items[i].Mode == nt.Native || items[i].Mode == nt.Terminal {
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

	return Success(c, maps.Map{
		"total": total,
		"items": items,
	})
}

func (api SessionApi) SessionDeleteEndpoint(c echo.Context) error {
	sessionIds := strings.Split(c.Param("id"), ",")
	err := service.SessionService.DeleteByIds(context.TODO(), sessionIds)
	if err != nil {
		return err
	}

	return Success(c, nil)
}

func (api SessionApi) SessionClearEndpoint(c echo.Context) error {
	err := service.SessionService.ClearOfflineSession()
	if err != nil {
		return err
	}
	return Success(c, nil)
}

func (api SessionApi) SessionReviewedEndpoint(c echo.Context) error {
	sessionIds := strings.Split(c.Param("id"), ",")
	if err := repository.SessionRepository.UpdateReadByIds(context.TODO(), true, sessionIds); err != nil {
		return err
	}
	return Success(c, nil)
}

func (api SessionApi) SessionUnViewedEndpoint(c echo.Context) error {
	sessionIds := strings.Split(c.Param("id"), ",")
	if err := repository.SessionRepository.UpdateReadByIds(context.TODO(), false, sessionIds); err != nil {
		return err
	}
	return Success(c, nil)
}

func (api SessionApi) SessionReviewedAllEndpoint(c echo.Context) error {
	if err := service.SessionService.ReviewedAll(); err != nil {
		return err
	}
	return Success(c, nil)
}

func (api SessionApi) SessionConnectEndpoint(c echo.Context) error {
	sessionId := c.Param("id")

	s := model.Session{}
	s.ID = sessionId
	s.Status = nt.Connected
	s.ConnectedTime = common.NowJsonTime()

	if err := repository.SessionRepository.UpdateById(context.TODO(), &s, sessionId); err != nil {
		return err
	}

	o, err := repository.SessionRepository.FindById(context.TODO(), sessionId)
	if err != nil {
		return err
	}
	asset, err := repository.AssetRepository.FindById(context.TODO(), o.AssetId)
	if err != nil {
		return err
	}
	if !asset.Active {
		asset.Active = true
		_ = repository.AssetRepository.UpdateById(context.TODO(), &asset, asset.ID)
	}

	return Success(c, nil)
}

func (api SessionApi) SessionDisconnectEndpoint(c echo.Context) error {
	sessionIds := c.Param("id")

	split := strings.Split(sessionIds, ",")
	for i := range split {
		service.SessionService.CloseSessionById(split[i], ForcedDisconnect, "管理员强制关闭了此会话")
	}
	return Success(c, nil)
}

func (api SessionApi) SessionResizeEndpoint(c echo.Context) error {
	width := c.QueryParam("width")
	height := c.QueryParam("height")
	sessionId := c.Param("id")

	if len(width) == 0 || len(height) == 0 {
		return errors.New("参数异常")
	}

	intWidth, _ := strconv.Atoi(width)
	intHeight, _ := strconv.Atoi(height)

	if err := repository.SessionRepository.UpdateWindowSizeById(context.TODO(), intWidth, intHeight, sessionId); err != nil {
		return err
	}
	return Success(c, "")
}

func (api SessionApi) SessionCreateEndpoint(c echo.Context) error {
	assetId := c.QueryParam("assetId")
	mode := c.QueryParam("mode")

	if mode == nt.Native {
		mode = nt.Native
	} else {
		mode = nt.Guacd
	}

	user, _ := GetCurrentAccount(c)

	s, err := service.SessionService.Create(c.RealIP(), assetId, mode, user)
	if err != nil {
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
		"fileSystem": s.FileSystem,
		"copy":       s.Copy,
		"paste":      s.Paste,
	})
}

func (api SessionApi) SessionUploadEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	s, err := repository.SessionRepository.FindById(context.TODO(), sessionId)
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

	// 记录日志
	account, _ := GetCurrentAccount(c)
	_ = service.StorageLogService.Save(context.Background(), s.AssetId, sessionId, account.ID, nt.StorageLogActionUpload, remoteFile)

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

		counter := &WriteCounter{Resp: c.Response()}

		c.Response().Header().Set(echo.HeaderContentType, `text/event-stream`)
		c.Response().WriteHeader(http.StatusOK)

		srcReader := io.TeeReader(src, counter)
		if _, err = io.Copy(dstFile, srcReader); err != nil {
			return err
		}
		return Success(c, nil)
	} else if "rdp" == s.Protocol {
		if err := service.StorageService.StorageUpload(c, file, s.StorageId); err != nil {
			return err
		}
		return Success(c, nil)
	}

	return err
}

func (api SessionApi) SessionEditEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	s, err := repository.SessionRepository.FindById(context.TODO(), sessionId)
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
		// replace \r\n to \n
		if _, err := write.WriteString(strings.Replace(fileContent, "\r\n", "\n", -1)); err != nil {
			return err
		}
		// fix neoel
		if !strings.HasSuffix(fileContent, "\n") {
			if _, err := write.WriteString("\n"); err != nil {
				return err
			}
		}
		if err := write.Flush(); err != nil {
			return err
		}
		return Success(c, nil)
	} else if "rdp" == s.Protocol {
		if err := service.StorageService.StorageEdit(file, fileContent, s.StorageId); err != nil {
			return err
		}
		return Success(c, nil)
	}
	return err
}

func (api SessionApi) SessionDownloadEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	s, err := repository.SessionRepository.FindById(context.TODO(), sessionId)
	if err != nil {
		return err
	}
	if s.Download != "1" {
		return errors.New("禁止操作")
	}
	file := c.QueryParam("file")

	// 记录日志
	account, _ := GetCurrentAccount(c)
	_ = service.StorageLogService.Save(context.Background(), s.AssetId, sessionId, account.ID, nt.StorageLogActionDownload, file)

	// 获取带后缀的文件名称
	filenameWithSuffix := path.Base(file)
	if "ssh" == s.Protocol {
		nextSession := session.GlobalSessionManager.GetById(sessionId)
		if nextSession == nil {
			return errors.New("获取会话失败")
		}

		dstFile, err := nextSession.NextTerminal.SftpClient.Open(file)
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
		return service.StorageService.StorageDownload(c, file, storageId)
	}

	return err
}

func (api SessionApi) SessionLsEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	s, err := service.SessionService.FindByIdAndDecrypt(context.TODO(), sessionId)
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

			file := service.File{
				Name:    fileInfos[i].Name(),
				Path:    path.Join(remoteDir, fileInfos[i].Name()),
				IsDir:   fileInfos[i].IsDir(),
				Mode:    fileInfos[i].Mode().String(),
				IsLink:  fileInfos[i].Mode()&os.ModeSymlink == os.ModeSymlink,
				ModTime: common.NewJsonTime(fileInfos[i].ModTime()),
				Size:    fileInfos[i].Size(),
			}

			files = append(files, file)
		}

		return Success(c, files)
	} else if "rdp" == s.Protocol {
		storageId := s.StorageId
		err, files := service.StorageService.StorageLs(remoteDir, storageId)
		if err != nil {
			return err
		}
		return Success(c, files)
	}

	return errors.New("当前协议不支持此操作")
}

func (api SessionApi) SessionMkDirEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	s, err := repository.SessionRepository.FindById(context.TODO(), sessionId)
	if err != nil {
		return err
	}
	if s.Upload != "1" {
		return errors.New("禁止操作")
	}
	remoteDir := c.QueryParam("dir")

	// 记录日志
	account, _ := GetCurrentAccount(c)
	_ = service.StorageLogService.Save(context.Background(), s.AssetId, sessionId, account.ID, nt.StorageLogActionMkdir, remoteDir)

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
		storageId := s.StorageId
		if err := service.StorageService.StorageMkDir(remoteDir, storageId); err != nil {
			return err
		}
		return Success(c, nil)
	}
	return errors.New("当前协议不支持此操作")
}

func (api SessionApi) SessionRmEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	s, err := repository.SessionRepository.FindById(context.TODO(), sessionId)
	if err != nil {
		return err
	}
	if s.Delete != "1" {
		return errors.New("禁止操作")
	}
	// 文件夹或者文件
	file := c.FormValue("file")

	// 记录日志
	account, _ := GetCurrentAccount(c)
	_ = service.StorageLogService.Save(context.Background(), s.AssetId, sessionId, account.ID, nt.StorageLogActionRm, file)

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
		storageId := s.StorageId
		if err := service.StorageService.StorageRm(file, storageId); err != nil {
			return err
		}
		return Success(c, nil)
	}

	return errors.New("当前协议不支持此操作")
}

func (api SessionApi) SessionRenameEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	s, err := repository.SessionRepository.FindById(context.TODO(), sessionId)
	if err != nil {
		return err
	}
	if s.Rename != "1" {
		return errors.New("禁止操作")
	}
	oldName := c.QueryParam("oldName")
	newName := c.QueryParam("newName")

	// 记录日志
	account, _ := GetCurrentAccount(c)
	_ = service.StorageLogService.Save(context.Background(), s.AssetId, sessionId, account.ID, nt.StorageLogActionRename, oldName)

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
		storageId := s.StorageId
		if err := service.StorageService.StorageRename(oldName, newName, storageId); err != nil {
			return err
		}
		return Success(c, nil)
	}
	return errors.New("当前协议不支持此操作")
}

func (api SessionApi) SessionRecordingEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	s, err := repository.SessionRepository.FindById(context.TODO(), sessionId)
	if err != nil {
		return err
	}

	var recording string
	if s.Mode == nt.Native || s.Mode == nt.Terminal {
		recording = s.Recording
	} else {
		recording = s.Recording + "/recording"
	}
	_ = repository.SessionRepository.UpdateReadByIds(context.TODO(), true, []string{sessionId})

	http.ServeFile(c.Response(), c.Request(), recording)
	return nil
}

func (api SessionApi) SessionGetEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	s, err := repository.SessionRepository.FindById(context.TODO(), sessionId)
	if err != nil {
		return err
	}
	return Success(c, s)
}

func (api SessionApi) SessionStatsEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	s, err := service.SessionService.FindByIdAndDecrypt(context.TODO(), sessionId)
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

	stats, err := GetAllStats(nextSession)
	if err != nil {
		return err
	}
	return Success(c, stats)
}
