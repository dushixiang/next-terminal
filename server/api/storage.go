package api

import (
	"context"
	"errors"
	"os"
	"path"
	"strconv"
	"strings"

	"next-terminal/server/common"
	"next-terminal/server/common/maps"
	"next-terminal/server/common/nt"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/service"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
)

type StorageApi struct{}

func (api StorageApi) StoragePagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	name := c.QueryParam("name")

	order := c.QueryParam("order")
	field := c.QueryParam("field")

	items, total, err := repository.StorageRepository.Find(context.TODO(), pageIndex, pageSize, name, order, field)
	if err != nil {
		return err
	}

	drivePath := service.StorageService.GetBaseDrivePath()

	for i := range items {
		item := items[i]
		dirSize, err := utils.DirSize(path.Join(drivePath, item.ID))
		if err != nil {
			items[i].UsedSize = -1
		} else {
			items[i].UsedSize = dirSize
		}
	}

	return Success(c, maps.Map{
		"total": total,
		"items": items,
	})
}

func (api StorageApi) StorageCreateEndpoint(c echo.Context) error {
	var item model.Storage
	if err := c.Bind(&item); err != nil {
		return err
	}

	account, _ := GetCurrentAccount(c)

	item.ID = utils.UUID()
	item.Created = common.NowJsonTime()
	item.Owner = account.ID
	// 创建对应的目录文件夹
	drivePath := service.StorageService.GetBaseDrivePath()
	if err := os.MkdirAll(path.Join(drivePath, item.ID), os.ModePerm); err != nil {
		return err
	}
	if err := repository.StorageRepository.Create(context.TODO(), &item); err != nil {
		return err
	}
	return Success(c, "")
}

func (api StorageApi) StorageUpdateEndpoint(c echo.Context) error {
	id := c.Param("id")
	var item model.Storage
	if err := c.Bind(&item); err != nil {
		return err
	}

	drivePath := service.StorageService.GetBaseDrivePath()
	dirSize, err := utils.DirSize(path.Join(drivePath, item.ID))
	if err != nil {
		return err
	}
	if item.LimitSize > 0 && item.LimitSize < dirSize {
		// 不能小于已使用的大小
		return errors.New("空间大小不能小于已使用大小")
	}

	storage, err := repository.StorageRepository.FindById(context.TODO(), id)
	if err != nil {
		return err
	}
	storage.Name = item.Name
	storage.LimitSize = item.LimitSize
	storage.IsShare = item.IsShare

	if err := repository.StorageRepository.SaveById(context.TODO(), &storage, id); err != nil {
		return err
	}
	return Success(c, "")
}

func (api StorageApi) StorageGetEndpoint(c echo.Context) error {
	storageId := c.Param("id")
	storage, err := repository.StorageRepository.FindById(context.TODO(), storageId)
	if err != nil {
		return err
	}
	structMap := utils.StructToMap(storage)
	drivePath := service.StorageService.GetBaseDrivePath()
	dirSize, err := utils.DirSize(path.Join(drivePath, storageId))
	if err != nil {
		structMap["usedSize"] = -1
	} else {
		structMap["usedSize"] = dirSize
	}

	return Success(c, structMap)
}

func (api StorageApi) StorageSharesEndpoint(c echo.Context) error {
	storages, err := repository.StorageRepository.FindShares(context.TODO())
	if err != nil {
		return err
	}
	return Success(c, storages)
}

func (api StorageApi) StorageDeleteEndpoint(c echo.Context) error {
	ids := c.Param("id")
	split := strings.Split(ids, ",")
	for i := range split {
		id := split[i]
		if err := service.StorageService.DeleteStorageById(context.TODO(), id, false); err != nil {
			return err
		}
	}
	return Success(c, nil)
}

func (api StorageApi) PermissionCheck(c echo.Context, id string) error {
	storage, err := repository.StorageRepository.FindById(context.TODO(), id)
	if err != nil {
		return err
	}
	account, _ := GetCurrentAccount(c)
	if account.Type != nt.TypeAdmin {
		if storage.Owner != account.ID {
			return errors.New("您没有权限访问此地址 :(")
		}
	}
	return nil
}

func (api StorageApi) StorageLsEndpoint(c echo.Context) error {
	storageId := c.Param("storageId")
	if err := api.PermissionCheck(c, storageId); err != nil {
		return err
	}
	remoteDir := c.FormValue("dir")
	err, files := service.StorageService.StorageLs(remoteDir, storageId)
	if err != nil {
		return err
	}
	return Success(c, files)
}

func (api StorageApi) StorageDownloadEndpoint(c echo.Context) error {
	storageId := c.Param("storageId")
	if err := api.PermissionCheck(c, storageId); err != nil {
		return err
	}
	file := c.QueryParam("file")
	return service.StorageService.StorageDownload(c, file, storageId)
}

func (api StorageApi) StorageUploadEndpoint(c echo.Context) error {
	storageId := c.Param("storageId")
	if err := api.PermissionCheck(c, storageId); err != nil {
		return err
	}
	file, err := c.FormFile("file")
	if err != nil {
		return err
	}

	if err := service.StorageService.StorageUpload(c, file, storageId); err != nil {
		return err
	}
	return Success(c, nil)
}

func (api StorageApi) StorageMkDirEndpoint(c echo.Context) error {
	storageId := c.Param("storageId")
	if err := api.PermissionCheck(c, storageId); err != nil {
		return err
	}
	remoteDir := c.QueryParam("dir")
	if err := service.StorageService.StorageMkDir(remoteDir, storageId); err != nil {
		return err
	}
	return Success(c, nil)
}

func (api StorageApi) StorageRmEndpoint(c echo.Context) error {
	storageId := c.Param("storageId")
	if err := api.PermissionCheck(c, storageId); err != nil {
		return err
	}
	// 文件夹或者文件
	file := c.FormValue("file")
	if err := service.StorageService.StorageRm(file, storageId); err != nil {
		return err
	}
	return Success(c, nil)
}

func (api StorageApi) StorageRenameEndpoint(c echo.Context) error {
	storageId := c.Param("storageId")
	if err := api.PermissionCheck(c, storageId); err != nil {
		return err
	}
	oldName := c.QueryParam("oldName")
	newName := c.QueryParam("newName")
	if err := service.StorageService.StorageRename(oldName, newName, storageId); err != nil {
		return err
	}
	return Success(c, nil)
}

func (api StorageApi) StorageEditEndpoint(c echo.Context) error {
	storageId := c.Param("storageId")
	if err := api.PermissionCheck(c, storageId); err != nil {
		return err
	}
	file := c.FormValue("file")
	fileContent := c.FormValue("fileContent")
	if err := service.StorageService.StorageEdit(file, fileContent, storageId); err != nil {
		return err
	}
	return Success(c, nil)
}
