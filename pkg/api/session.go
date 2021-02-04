package api

import (
	"bytes"
	"errors"
	"fmt"
	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
	"github.com/sirupsen/logrus"
	"io"
	"io/ioutil"
	"net/http"
	"next-terminal/pkg/global"
	"next-terminal/pkg/guacd"
	"next-terminal/pkg/model"
	"next-terminal/pkg/utils"
	"os"
	"path"
	"strconv"
	"strings"
	"sync"
)

func SessionPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	status := c.QueryParam("status")
	userId := c.QueryParam("userId")
	clientIp := c.QueryParam("clientIp")
	assetId := c.QueryParam("assetId")
	protocol := c.QueryParam("protocol")

	items, total, err := model.FindPageSession(pageIndex, pageSize, status, userId, clientIp, assetId, protocol)

	if err != nil {
		return err
	}

	for i := 0; i < len(items); i++ {
		if status == model.Disconnected && len(items[i].Recording) > 0 {

			var recording string
			if items[i].Mode == model.Naive {
				recording = items[i].Recording
			} else {
				recording = items[i].Recording + "/recording"
			}

			if utils.FileExists(recording) {
				logrus.Debugf("检测到录屏文件[%v]存在", recording)
				items[i].Recording = "1"
			} else {
				logrus.Warnf("检测到录屏文件[%v]不存在", recording)
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
	for i := range split {
		drivePath, err := model.GetRecordingPath()
		if err != nil {
			continue
		}
		if err := os.RemoveAll(path.Join(drivePath, split[i])); err != nil {
			return err
		}
		model.DeleteSessionById(split[i])
	}

	return Success(c, nil)
}

func SessionConnectEndpoint(c echo.Context) error {
	sessionId := c.Param("id")

	session := model.Session{}
	session.ID = sessionId
	session.Status = model.Connected
	session.ConnectedTime = utils.NowJsonTime()

	if err := model.UpdateSessionById(&session, sessionId); err != nil {
		return err
	}
	return Success(c, nil)
}

func SessionDisconnectEndpoint(c echo.Context) error {
	sessionIds := c.Param("id")

	split := strings.Split(sessionIds, ",")
	for i := range split {
		CloseSessionById(split[i], ForcedDisconnect, "forced disconnect")
	}
	return Success(c, nil)
}

var mutex sync.Mutex

func CloseSessionById(sessionId string, code int, reason string) {
	mutex.Lock()
	defer mutex.Unlock()
	observable, _ := global.Store.Get(sessionId)
	if observable != nil {
		logrus.Debugf("会话%v创建者退出", observable.Subject.Tunnel.UUID)
		observable.Subject.Close()

		for i := 0; i < len(observable.Observers); i++ {
			observable.Observers[i].Close()
			CloseWebSocket(observable.Observers[i].WebSocket, code, reason)
			logrus.Debugf("强制踢出会话%v的观察者", observable.Observers[i].Tunnel.UUID)
		}

		CloseWebSocket(observable.Subject.WebSocket, code, reason)
	}
	global.Store.Del(sessionId)

	s, err := model.FindSessionById(sessionId)
	if err != nil {
		return
	}

	if s.Status == model.Disconnected {
		return
	}

	if s.Status == model.Connecting {
		// 会话还未建立成功，无需保留数据
		model.DeleteSessionById(sessionId)
		return
	}

	session := model.Session{}
	session.ID = sessionId
	session.Status = model.Disconnected
	session.DisconnectedTime = utils.NowJsonTime()
	session.Code = code
	session.Message = reason

	_ = model.UpdateSessionById(&session, sessionId)
}

func CloseWebSocket(ws *websocket.Conn, c int, t string) {
	if ws == nil {
		return
	}
	err := guacd.NewInstruction("error", "", strconv.Itoa(c))
	_ = ws.WriteMessage(websocket.TextMessage, []byte(err.String()))
	disconnect := guacd.NewInstruction("disconnect")
	_ = ws.WriteMessage(websocket.TextMessage, []byte(disconnect.String()))
	//defer ws.Close()
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

	if err := model.UpdateSessionWindowSizeById(intWidth, intHeight, sessionId); err != nil {
		return err
	}
	return Success(c, "")
}

func SessionCreateEndpoint(c echo.Context) error {
	assetId := c.QueryParam("assetId")
	mode := c.QueryParam("mode")

	if mode == model.Naive {
		mode = model.Naive
	} else {
		mode = model.Guacd
	}

	user, _ := GetCurrentAccount(c)

	if model.TypeUser == user.Type {
		// 检测是否有访问权限
		assetIds, err := model.FindAssetIdsByUserId(user.ID)
		if err != nil {
			return err
		}

		if !utils.Contains(assetIds, assetId) {
			return errors.New("您没有权限访问此资产")
		}
	}

	asset, err := model.FindAssetById(assetId)
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
		Status:     model.NoConnect,
		Creator:    user.ID,
		ClientIP:   c.RealIP(),
		Mode:       mode,
	}

	if asset.AccountType == "credential" {
		credential, err := model.FindCredentialById(asset.CredentialId)
		if err != nil {
			return err
		}

		if credential.Type == model.Custom {
			session.Username = credential.Username
			session.Password = credential.Password
		} else {
			session.Username = credential.Username
			session.PrivateKey = credential.PrivateKey
			session.Passphrase = credential.Passphrase
		}
	}

	if err := model.CreateNewSession(session); err != nil {
		return err
	}

	return Success(c, session)
}

func SessionUploadEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	session, err := model.FindSessionById(sessionId)
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

		dstFile, err := tun.Subject.SftpClient.Create(remoteFile)
		defer dstFile.Close()
		if err != nil {
			return err
		}

		buf := make([]byte, 1024)
		for {
			n, _ := src.Read(buf)
			if n == 0 {
				break
			}
			_, _ = dstFile.Write(buf)
		}
		return Success(c, nil)
	} else if "rdp" == session.Protocol {
		drivePath, err := model.GetDrivePath()
		if err != nil {
			return err
		}

		// Destination
		dst, err := os.Create(path.Join(drivePath, remoteFile))
		if err != nil {
			return err
		}
		defer dst.Close()

		// Copy
		if _, err = io.Copy(dst, src); err != nil {
			return err
		}
		return Success(c, nil)
	}

	return err
}

func SessionDownloadEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	session, err := model.FindSessionById(sessionId)
	if err != nil {
		return err
	}
	//remoteDir := c.Query("dir")
	remoteFile := c.QueryParam("file")

	if "ssh" == session.Protocol {
		tun, ok := global.Store.Get(sessionId)
		if !ok {
			return errors.New("获取sftp客户端失败")
		}

		dstFile, err := tun.Subject.SftpClient.Open(remoteFile)
		if err != nil {
			return err
		}

		defer dstFile.Close()
		// 获取带后缀的文件名称
		filenameWithSuffix := path.Base(remoteFile)
		c.Response().Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filenameWithSuffix))

		var buff bytes.Buffer
		if _, err := dstFile.WriteTo(&buff); err != nil {
			return err
		}

		return c.Stream(http.StatusOK, echo.MIMEOctetStream, bytes.NewReader(buff.Bytes()))
	} else if "rdp" == session.Protocol {
		drivePath, err := model.GetDrivePath()
		if err != nil {
			return err
		}

		return c.File(path.Join(drivePath, remoteFile))
	}

	return err
}

type File struct {
	Name    string         `json:"name"`
	Path    string         `json:"path"`
	IsDir   bool           `json:"isDir"`
	Mode    string         `json:"mode"`
	IsLink  bool           `json:"isLink"`
	ModTime utils.JsonTime `json:"modTime"`
	Size    int64          `json:"size"`
}

func SessionLsEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	session, err := model.FindSessionById(sessionId)
	if err != nil {
		return err
	}
	remoteDir := c.QueryParam("dir")
	if "ssh" == session.Protocol {
		tun, ok := global.Store.Get(sessionId)
		if !ok {
			return errors.New("获取sftp客户端失败")
		}

		if tun.Subject.SftpClient == nil {
			sftpClient, err := CreateSftpClient(session)
			if err != nil {
				logrus.Errorf("创建sftp客户端失败：%v", err.Error())
				return err
			}
			tun.Subject.SftpClient = sftpClient
		}

		fileInfos, err := tun.Subject.SftpClient.ReadDir(remoteDir)
		if err != nil {
			return err
		}

		var files = make([]File, 0)
		for i := range fileInfos {

			// 忽略因此文件
			if strings.HasPrefix(fileInfos[i].Name(), ".") {
				continue
			}

			file := File{
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
	} else if "rdp" == session.Protocol {
		drivePath, err := model.GetDrivePath()
		if err != nil {
			return err
		}
		fileInfos, err := ioutil.ReadDir(path.Join(drivePath, remoteDir))
		if err != nil {
			return err
		}

		var files = make([]File, 0)
		for i := range fileInfos {
			file := File{
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

func SessionMkDirEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	session, err := model.FindSessionById(sessionId)
	if err != nil {
		return err
	}
	remoteDir := c.QueryParam("dir")
	if "ssh" == session.Protocol {
		tun, ok := global.Store.Get(sessionId)
		if !ok {
			return errors.New("获取sftp客户端失败")
		}
		if err := tun.Subject.SftpClient.Mkdir(remoteDir); err != nil {
			return err
		}
		return Success(c, nil)
	} else if "rdp" == session.Protocol {
		drivePath, err := model.GetDrivePath()
		if err != nil {
			return err
		}

		if err := os.MkdirAll(path.Join(drivePath, remoteDir), os.ModePerm); err != nil {
			return err
		}
		return Success(c, nil)
	}

	return errors.New("当前协议不支持此操作")
}

func SessionRmEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	session, err := model.FindSessionById(sessionId)
	if err != nil {
		return err
	}
	key := c.QueryParam("key")
	if "ssh" == session.Protocol {
		tun, ok := global.Store.Get(sessionId)
		if !ok {
			return errors.New("获取sftp客户端失败")
		}

		sftpClient := tun.Subject.SftpClient

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
	} else if "rdp" == session.Protocol {
		drivePath, err := model.GetDrivePath()
		if err != nil {
			return err
		}

		if err := os.RemoveAll(path.Join(drivePath, key)); err != nil {
			return err
		}

		return Success(c, nil)
	}

	return errors.New("当前协议不支持此操作")
}

func SessionRenameEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	session, err := model.FindSessionById(sessionId)
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

		sftpClient := tun.Subject.SftpClient

		if err := sftpClient.Rename(oldName, newName); err != nil {
			return err
		}

		return Success(c, nil)
	} else if "rdp" == session.Protocol {
		drivePath, err := model.GetDrivePath()
		if err != nil {
			return err
		}

		if err := os.Rename(path.Join(drivePath, oldName), path.Join(drivePath, newName)); err != nil {
			return err
		}

		return Success(c, nil)
	}
	return errors.New("当前协议不支持此操作")
}

func SessionRecordingEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	session, err := model.FindSessionById(sessionId)
	if err != nil {
		return err
	}

	var recording string
	if session.Mode == model.Naive {
		recording = session.Recording
	} else {
		recording = session.Recording + "/recording"
	}

	logrus.Debugf("读取录屏文件：%v,是否存在: %v, 是否为文件: %v", recording, utils.FileExists(recording), utils.IsFile(recording))
	return c.File(recording)
}
