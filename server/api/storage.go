package api

import (
	"errors"
	"io"
	"os"
	"path"
	"strconv"
	"strings"

	"next-terminal/pkg/constant"
	"next-terminal/server/model"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
)

func StoragePagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	name := c.QueryParam("name")

	order := c.QueryParam("order")
	field := c.QueryParam("field")

	items, total, err := storageRepository.Find(pageIndex, pageSize, name, order, field)
	if err != nil {
		return err
	}

	drivePath := storageService.GetBaseDrivePath()

	for i := range items {
		item := items[i]
		dirSize, err := utils.DirSize(path.Join(drivePath, item.ID))
		if err != nil {
			return err
		}
		items[i].UsedSize = dirSize
	}

	return Success(c, H{
		"total": total,
		"items": items,
	})
}

func StorageCreateEndpoint(c echo.Context) error {
	var item model.Storage
	if err := c.Bind(&item); err != nil {
		return err
	}

	account, _ := GetCurrentAccount(c)

	item.ID = utils.UUID()
	item.Created = utils.NowJsonTime()
	item.Owner = account.ID
	// 创建对应的目录文件夹
	drivePath := storageService.GetBaseDrivePath()
	if err := os.MkdirAll(path.Join(drivePath, item.ID), os.ModePerm); err != nil {
		return err
	}
	if err := storageRepository.Create(&item); err != nil {
		return err
	}
	return Success(c, "")
}

func StorageUpdateEndpoint(c echo.Context) error {
	id := c.Param("id")
	var item model.Storage
	if err := c.Bind(&item); err != nil {
		return err
	}

	drivePath := storageService.GetBaseDrivePath()
	dirSize, err := utils.DirSize(path.Join(drivePath, item.ID))
	if err != nil {
		return err
	}
	if item.LimitSize < dirSize {
		// 不能小于已使用的大小
		return errors.New("空间大小不能小于已使用大小")
	}

	storage, err := storageRepository.FindById(id)
	if err != nil {
		return err
	}
	storage.Name = item.Name
	storage.LimitSize = item.LimitSize
	storage.IsShare = item.IsShare

	if err := storageRepository.UpdateById(&storage, id); err != nil {
		return err
	}
	return Success(c, "")
}

func StorageGetEndpoint(c echo.Context) error {
	id := c.Param("id")
	storage, err := storageRepository.FindById(id)
	if err != nil {
		return err
	}
	drivePath := storageService.GetBaseDrivePath()
	dirSize, err := utils.DirSize(path.Join(drivePath, id))
	if err != nil {
		return err
	}
	structMap := utils.StructToMap(storage)
	structMap["usedSize"] = dirSize
	return Success(c, structMap)
}

func StorageSharesEndpoint(c echo.Context) error {
	storages, err := storageRepository.FindShares()
	if err != nil {
		return err
	}
	return Success(c, storages)
}

func StorageDeleteEndpoint(c echo.Context) error {
	ids := c.Param("id")
	drivePath := storageService.GetBaseDrivePath()
	split := strings.Split(ids, ",")
	for i := range split {
		id := split[i]
		storage, err := storageRepository.FindById(id)
		if err != nil {
			return err
		}
		if storage.IsDefault {
			return errors.New("默认空间不能删除")
		}
		// 删除对应的本地目录
		if err := os.RemoveAll(path.Join(drivePath, id)); err != nil {
			return err
		}
		if err := storageRepository.DeleteById(id); err != nil {
			return err
		}
	}
	return Success(c, nil)
}

func PermissionCheck(c echo.Context, id string) error {
	storage, err := storageRepository.FindById(id)
	if err != nil {
		return err
	}
	if !storage.IsShare {
		account, _ := GetCurrentAccount(c)
		if account.Type != constant.TypeAdmin {
			if storage.Owner != account.ID {
				return errors.New("您没有权限访问此地址 :(")
			}
		}
	}
	return nil
}

func StorageLsEndpoint(c echo.Context) error {
	id := c.Param("id")
	if err := PermissionCheck(c, id); err != nil {
		return err
	}

	drivePath := storageService.GetBaseDrivePath()
	remoteDir := c.QueryParam("dir")
	if strings.Contains(remoteDir, "../") {
		return Fail(c, -1, "非法请求 :(")
	}
	files, err := storageService.Ls(path.Join(drivePath, id), remoteDir)
	if err != nil {
		return err
	}
	return Success(c, files)
}

func StorageDownloadEndpoint(c echo.Context) error {
	id := c.Param("id")
	if err := PermissionCheck(c, id); err != nil {
		return err
	}

	drivePath := storageService.GetBaseDrivePath()
	remoteFile := c.QueryParam("file")
	if strings.Contains(remoteFile, "../") {
		return Fail(c, -1, "非法请求 :(")
	}
	// 获取带后缀的文件名称
	filenameWithSuffix := path.Base(remoteFile)
	return c.Attachment(path.Join(path.Join(drivePath, id), remoteFile), filenameWithSuffix)
}

func StorageUploadEndpoint(c echo.Context) error {
	id := c.Param("id")
	if err := PermissionCheck(c, id); err != nil {
		return err
	}
	drivePath := storageService.GetBaseDrivePath()
	file, err := c.FormFile("file")
	if err != nil {
		return err
	}

	storage, _ := storageRepository.FindById(id)
	if storage.LimitSize > 0 {
		dirSize, err := utils.DirSize(path.Join(drivePath, id))
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

	if strings.Contains(remoteFile, "../") {
		return Fail(c, -1, "非法请求 :(")
	}

	// Destination
	dst, err := os.Create(path.Join(path.Join(drivePath, id), remoteFile))
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

func StorageMkDirEndpoint(c echo.Context) error {
	id := c.Param("id")
	if err := PermissionCheck(c, id); err != nil {
		return err
	}
	drivePath := storageService.GetBaseDrivePath()
	remoteDir := c.QueryParam("dir")
	if strings.Contains(remoteDir, "../") {
		SafetyRuleTrigger(c)
		return Fail(c, -1, ":) 非法请求")
	}
	if err := os.MkdirAll(path.Join(path.Join(drivePath, id), remoteDir), os.ModePerm); err != nil {
		return err
	}
	return Success(c, nil)
}

func StorageRmEndpoint(c echo.Context) error {
	id := c.Param("id")
	if err := PermissionCheck(c, id); err != nil {
		return err
	}
	drivePath := storageService.GetBaseDrivePath()
	// 文件夹或者文件
	key := c.QueryParam("key")
	if strings.Contains(key, "../") {
		return Fail(c, -1, ":) 非法请求")
	}
	if err := os.RemoveAll(path.Join(path.Join(drivePath, id), key)); err != nil {
		return err
	}
	return Success(c, nil)
}

func StorageRenameEndpoint(c echo.Context) error {
	id := c.Param("id")
	if err := PermissionCheck(c, id); err != nil {
		return err
	}
	drivePath := storageService.GetBaseDrivePath()
	oldName := c.QueryParam("oldName")
	newName := c.QueryParam("newName")
	if strings.Contains(oldName, "../") {
		return Fail(c, -1, ":) 非法请求")
	}
	if strings.Contains(newName, "../") {
		return Fail(c, -1, ":) 非法请求")
	}
	if err := os.Rename(path.Join(path.Join(drivePath, id), oldName), path.Join(path.Join(drivePath, id), newName)); err != nil {
		return err
	}
	return Success(c, nil)
}
