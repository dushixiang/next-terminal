package service

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"mime/multipart"
	"net/http"
	"os"
	"path"
	"strconv"
	"strings"

	"next-terminal/server/config"
	"next-terminal/server/log"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type storageService struct {
}

func (service storageService) InitStorages() error {
	users, err := repository.UserRepository.FindAll(context.TODO())
	if err != nil {
		return err
	}
	for i := range users {
		userId := users[i].ID
		_, err := repository.StorageRepository.FindByOwnerIdAndDefault(context.TODO(), userId, true)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			err = service.CreateStorageByUser(context.TODO(), &users[i])
			if err != nil {
				return err
			}
		}
	}

	drivePath := service.GetBaseDrivePath()
	storages, err := repository.StorageRepository.FindAll(context.TODO())
	if err != nil {
		return err
	}
	for i := 0; i < len(storages); i++ {
		storage := storages[i]
		// 判断是否为遗留的数据：磁盘空间在，但用户已删除
		if storage.IsDefault {
			var userExist = false
			for j := range users {
				if storage.ID == users[j].ID {
					userExist = true
					break
				}
			}

			if !userExist {
				if err := service.DeleteStorageById(context.TODO(), storage.ID, true); err != nil {
					return err
				}
			}
		}

		storageDir := path.Join(drivePath, storage.ID)
		if !utils.FileExists(storageDir) {
			if err := os.MkdirAll(storageDir, os.ModePerm); err != nil {
				return err
			}
			log.Infof("创建storage:「%v」文件夹: %v", storage.Name, storageDir)
		}
	}
	return nil
}

func (service storageService) CreateStorageByUser(c context.Context, user *model.User) error {
	drivePath := service.GetBaseDrivePath()
	var limitSize int64
	property, err := repository.PropertyRepository.FindByName(c, "user-default-storage-size")
	if err != nil {
		return err
	}
	limitSize, err = strconv.ParseInt(property.Value, 10, 64)
	if err != nil {
		return err
	}

	limitSize = limitSize * 1024 * 1024
	if limitSize < 0 {
		limitSize = -1
	}

	storage := model.Storage{
		ID:        user.ID,
		Name:      user.Nickname + "的默认空间",
		IsShare:   false,
		IsDefault: true,
		LimitSize: limitSize,
		Owner:     user.ID,
		Created:   utils.NowJsonTime(),
	}
	storageDir := path.Join(drivePath, storage.ID)
	if err := os.MkdirAll(storageDir, os.ModePerm); err != nil {
		return err
	}
	log.Infof("创建storage:「%v」文件夹: %v", storage.Name, storageDir)
	err = repository.StorageRepository.Create(c, &storage)
	if err != nil {
		_ = os.RemoveAll(storageDir)
		return err
	}
	return nil
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

func (service storageService) Ls(drivePath, remoteDir string) ([]File, error) {
	fileInfos, err := ioutil.ReadDir(path.Join(drivePath, remoteDir))
	if err != nil {
		return nil, err
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
	return files, nil
}

func (service storageService) GetBaseDrivePath() string {
	return config.GlobalCfg.Guacd.Drive
}

func (service storageService) DeleteStorageById(c context.Context, id string, force bool) error {
	drivePath := service.GetBaseDrivePath()
	storage, err := repository.StorageRepository.FindById(c, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}
	if !force && storage.IsDefault {
		return errors.New("默认空间不能删除")
	}

	// 删除对应的本地目录
	if err := os.RemoveAll(path.Join(drivePath, id)); err != nil {
		return err
	}
	if err := repository.StorageRepository.DeleteById(c, id); err != nil {
		return err
	}
	return nil
}

func (service storageService) StorageUpload(c echo.Context, file *multipart.FileHeader, storageId string) error {
	drivePath := service.GetBaseDrivePath()
	storage, _ := repository.StorageRepository.FindById(context.TODO(), storageId)
	if storage.LimitSize > 0 {
		dirSize, err := utils.DirSize(path.Join(drivePath, storageId))
		if err != nil {
			return err
		}
		if dirSize+file.Size > storage.LimitSize {
			return errors.New("可用空间不足")
		}
	}

	filename := file.Filename
	src, err := file.Open()
	if err != nil {
		return err
	}

	remoteDir := c.QueryParam("dir")
	remoteFile := path.Join(remoteDir, filename)

	if strings.Contains(remoteDir, "../") {
		return errors.New("非法请求 :(")
	}
	if strings.Contains(remoteFile, "../") {
		return errors.New("非法请求 :(")
	}

	// 判断文件夹不存在时自动创建
	dir := path.Join(path.Join(drivePath, storageId), remoteDir)
	if !utils.FileExists(dir) {
		if err := os.MkdirAll(dir, os.ModePerm); err != nil {
			return err
		}
	}
	// Destination
	dst, err := os.Create(path.Join(path.Join(drivePath, storageId), remoteFile))
	if err != nil {
		return err
	}
	defer dst.Close()

	// Copy
	if _, err = io.Copy(dst, src); err != nil {
		return err
	}
	return nil
}

func (service storageService) StorageEdit(file string, fileContent string, storageId string) error {
	drivePath := service.GetBaseDrivePath()
	if strings.Contains(file, "../") {
		return errors.New("非法请求 :(")
	}
	realFilePath := path.Join(path.Join(drivePath, storageId), file)
	dstFile, err := os.OpenFile(realFilePath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0666)
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
	return nil
}

func (service storageService) StorageDownload(c echo.Context, file, storageId string) error {
	drivePath := service.GetBaseDrivePath()
	if strings.Contains(file, "../") {
		return errors.New("非法请求 :(")
	}
	// 获取带后缀的文件名称
	filenameWithSuffix := path.Base(file)
	p := path.Join(path.Join(drivePath, storageId), file)
	//log.Infof("download %v", p)
	c.Response().Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filenameWithSuffix))
	c.Response().Header().Set("Content-Type", "application/octet-stream")

	http.ServeFile(c.Response(), c.Request(), p)
	return nil
}

func (service storageService) StorageLs(remoteDir, storageId string) (error, []File) {
	drivePath := service.GetBaseDrivePath()
	if strings.Contains(remoteDir, "../") {
		return errors.New("非法请求 :("), nil
	}
	files, err := service.Ls(path.Join(drivePath, storageId), remoteDir)
	if err != nil {
		return err, nil
	}
	return nil, files
}

func (service storageService) StorageMkDir(remoteDir, storageId string) error {
	drivePath := service.GetBaseDrivePath()
	if strings.Contains(remoteDir, "../") {
		return errors.New("非法请求 :(")
	}
	if err := os.MkdirAll(path.Join(path.Join(drivePath, storageId), remoteDir), os.ModePerm); err != nil {
		return err
	}
	return nil
}

func (service storageService) StorageRm(file, storageId string) error {
	drivePath := service.GetBaseDrivePath()
	if strings.Contains(file, "../") {
		return errors.New("非法请求 :(")
	}
	if err := os.RemoveAll(path.Join(path.Join(drivePath, storageId), file)); err != nil {
		return err
	}
	return nil
}

func (service storageService) StorageRename(oldName, newName, storageId string) error {
	drivePath := service.GetBaseDrivePath()
	if strings.Contains(oldName, "../") {
		return errors.New("非法请求 :(")
	}
	if strings.Contains(newName, "../") {
		return errors.New("非法请求 :(")
	}
	if err := os.Rename(path.Join(path.Join(drivePath, storageId), oldName), path.Join(path.Join(drivePath, storageId), newName)); err != nil {
		return err
	}
	return nil
}
