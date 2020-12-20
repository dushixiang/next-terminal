package api

import (
	"bytes"
	"errors"
	"fmt"
	"github.com/labstack/echo/v4"
	"io"
	"io/ioutil"
	"net/http"
	"next-terminal/pkg/config"
	"next-terminal/pkg/model"
	"next-terminal/pkg/utils"
	"os"
	"path"
	"strconv"
	"strings"
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

	return Success(c, H{
		"total": total,
		"items": items,
	})
}

func SessionDeleteEndpoint(c echo.Context) error {
	sessionIds := c.Param("id")
	split := strings.Split(sessionIds, ",")
	for i := range split {
		model.DeleteSessionById(split[i])
		drivePath, err := model.GetDrivePath()
		if err != nil {
			continue
		}
		_ = os.Remove(path.Join(drivePath, split[i]))
	}

	return Success(c, nil)
}

func SessionContentEndpoint(c echo.Context) error {
	sessionId := c.Param("id")

	session := model.Session{}
	session.ID = sessionId
	session.Status = model.Connected
	session.ConnectedTime = utils.NowJsonTime()

	model.UpdateSessionById(&session, sessionId)
	return Success(c, nil)
}

func SessionDiscontentEndpoint(c echo.Context) error {
	sessionIds := c.Param("id")

	split := strings.Split(sessionIds, ",")
	for i := range split {
		tun, ok := config.Store.Get(split[i])
		if ok {
			CloseSession(split[i], tun)
		}
	}
	return Success(c, nil)
}

func CloseSession(sessionId string, tun config.Tun) {
	_ = tun.Tun.Close()
	config.Store.Del(sessionId)

	session := model.Session{}
	session.ID = sessionId
	session.Status = model.Disconnected
	session.DisconnectedTime = utils.NowJsonTime()

	model.UpdateSessionById(&session, sessionId)
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

	session := model.Session{}
	session.ID = sessionId
	session.Width = intWidth
	session.Height = intHeight

	model.UpdateSessionById(&session, sessionId)
	return Success(c, session)
}

func SessionCreateEndpoint(c echo.Context) error {
	assetId := c.QueryParam("assetId")
	user, _ := GetCurrentAccount(c)

	asset, err := model.FindAssetById(assetId)
	if err != nil {
		return err
	}

	session := &model.Session{
		ID:       utils.UUID(),
		AssetId:  asset.ID,
		Username: asset.Username,
		Password: asset.Password,
		Protocol: asset.Protocol,
		IP:       asset.IP,
		Port:     asset.Port,
		Status:   model.NoConnect,
		Creator:  user.ID,
		ClientIP: c.RealIP(),
	}

	if asset.AccountType == "credential" {
		credential, err := model.FindCredentialById(asset.CredentialId)
		if err != nil {
			return err
		}

		session.Username = credential.Username
		session.Password = credential.Password
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
		tun, ok := config.Store.Get(sessionId)
		if !ok {
			return errors.New("获取sftp客户端失败")
		}

		dstFile, err := tun.SftpClient.Create(remoteFile)
		if err != nil {
			return err
		}

		defer dstFile.Close()

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
		tun, ok := config.Store.Get(sessionId)
		if !ok {
			return errors.New("获取sftp客户端失败")
		}

		dstFile, err := tun.SftpClient.Open(remoteFile)
		if err != nil {
			return err
		}

		defer dstFile.Close()
		c.Response().Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", remoteFile))

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
	Name   string `json:"name"`
	Path   string `json:"path"`
	IsDir  bool   `json:"isDir"`
	Mode   string `json:"mode"`
	IsLink bool   `json:"isLink"`
}

func SessionLsEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	session, err := model.FindSessionById(sessionId)
	if err != nil {
		return err
	}
	remoteDir := c.QueryParam("dir")
	if "ssh" == session.Protocol {
		tun, ok := config.Store.Get(sessionId)
		if !ok {
			return errors.New("获取sftp客户端失败")
		}

		fileInfos, err := tun.SftpClient.ReadDir(remoteDir)
		if err != nil {
			return err
		}

		var files = make([]File, 0)
		for i := range fileInfos {
			file := File{
				Name:   fileInfos[i].Name(),
				Path:   path.Join(remoteDir, fileInfos[i].Name()),
				IsDir:  fileInfos[i].IsDir(),
				Mode:   fileInfos[i].Mode().String(),
				IsLink: fileInfos[i].Mode()&os.ModeSymlink == os.ModeSymlink,
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
				Name:   fileInfos[i].Name(),
				Path:   path.Join(remoteDir, fileInfos[i].Name()),
				IsDir:  fileInfos[i].IsDir(),
				Mode:   fileInfos[i].Mode().String(),
				IsLink: fileInfos[i].Mode()&os.ModeSymlink == os.ModeSymlink,
			}

			files = append(files, file)
		}

		return Success(c, files)
	}

	return err
}

func SessionMkDirEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	session, err := model.FindSessionById(sessionId)
	if err != nil {
		return err
	}
	remoteDir := c.QueryParam("dir")
	if "ssh" == session.Protocol {
		tun, ok := config.Store.Get(sessionId)
		if !ok {
			return errors.New("获取sftp客户端失败")
		}
		if err := tun.SftpClient.Mkdir(remoteDir); err != nil {
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

	return nil
}

func SessionRmDirEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	session, err := model.FindSessionById(sessionId)
	if err != nil {
		return err
	}
	remoteDir := c.QueryParam("dir")
	if "ssh" == session.Protocol {
		tun, ok := config.Store.Get(sessionId)
		if !ok {
			return errors.New("获取sftp客户端失败")
		}
		fileInfos, err := tun.SftpClient.ReadDir(remoteDir)
		if err != nil {
			return err
		}

		for i := range fileInfos {
			if err := tun.SftpClient.Remove(path.Join(remoteDir, fileInfos[i].Name())); err != nil {
				return err
			}
		}

		if err := tun.SftpClient.RemoveDirectory(remoteDir); err != nil {
			return err
		}
		return Success(c, nil)
	} else if "rdp" == session.Protocol {
		drivePath, err := model.GetDrivePath()
		if err != nil {
			return err
		}

		if err := os.RemoveAll(path.Join(drivePath, remoteDir)); err != nil {
			return err
		}
		return Success(c, nil)
	}

	return nil
}

func SessionRmEndpoint(c echo.Context) error {
	sessionId := c.Param("id")
	session, err := model.FindSessionById(sessionId)
	if err != nil {
		return err
	}
	remoteFile := c.QueryParam("file")
	if "ssh" == session.Protocol {
		tun, ok := config.Store.Get(sessionId)
		if !ok {
			return errors.New("获取sftp客户端失败")
		}
		if err := tun.SftpClient.Remove(remoteFile); err != nil {
			return err
		}
		return Success(c, nil)
	} else if "rdp" == session.Protocol {
		drivePath, err := model.GetDrivePath()
		if err != nil {
			return err
		}

		if err := os.Remove(path.Join(drivePath, remoteFile)); err != nil {
			return err
		}
		return Success(c, nil)
	}
	return nil
}
