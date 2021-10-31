package api

import (
	"bufio"
	"errors"
	"io"
	"mime/multipart"
	"os"
	"path"
	"strconv"
	"strings"

	"next-terminal/server/constant"
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
			items[i].UsedSize = -1
		} else {
			items[i].UsedSize = dirSize
		}
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
	if item.LimitSize > 0 && item.LimitSize < dirSize {
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
	storageId := c.Param("id")
	storage, err := storageRepository.FindById(storageId)
	if err != nil {
		return err
	}
	structMap := utils.StructToMap(storage)
	drivePath := storageService.GetBaseDrivePath()
	dirSize, err := utils.DirSize(path.Join(drivePath, storageId))
	if err != nil {
		structMap["usedSize"] = -1
	} else {
		structMap["usedSize"] = dirSize
	}

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
	split := strings.Split(ids, ",")
	for i := range split {
		id := split[i]
		if err := storageService.DeleteStorageById(id, false); err != nil {
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
	account, _ := GetCurrentAccount(c)
	if account.Type != constant.TypeAdmin {
		if storage.Owner != account.ID {
			return errors.New("您没有权限访问此地址 :(")
		}
	}
	return nil
}

func StorageLsEndpoint(c echo.Context) error {
	storageId := c.Param("storageId")
	if err := PermissionCheck(c, storageId); err != nil {
		return err
	}
	remoteDir := c.FormValue("dir")
	return StorageLs(c, remoteDir, storageId)
}

func StorageLs(c echo.Context, remoteDir, storageId string) error {
	drivePath := storageService.GetBaseDrivePath()
	if strings.Contains(remoteDir, "../") {
		return Fail(c, -1, "非法请求 :(")
	}
	files, err := storageService.Ls(path.Join(drivePath, storageId), remoteDir)
	if err != nil {
		return err
	}
	return Success(c, files)
}

func StorageDownloadEndpoint(c echo.Context) error {
	storageId := c.Param("storageId")
	if err := PermissionCheck(c, storageId); err != nil {
		return err
	}
	remoteFile := c.QueryParam("file")
	return StorageDownload(c, remoteFile, storageId)
}

func StorageDownload(c echo.Context, remoteFile, storageId string) error {
	drivePath := storageService.GetBaseDrivePath()
	if strings.Contains(remoteFile, "../") {
		return Fail(c, -1, "非法请求 :(")
	}
	// 获取带后缀的文件名称
	filenameWithSuffix := path.Base(remoteFile)
	return c.Attachment(path.Join(path.Join(drivePath, storageId), remoteFile), filenameWithSuffix)
}

func StorageUploadEndpoint(c echo.Context) error {
	storageId := c.Param("storageId")
	if err := PermissionCheck(c, storageId); err != nil {
		return err
	}
	file, err := c.FormFile("file")
	if err != nil {
		return err
	}

	return StorageUpload(c, file, storageId)
}

func StorageUpload(c echo.Context, file *multipart.FileHeader, storageId string) error {
	drivePath := storageService.GetBaseDrivePath()
	storage, _ := storageRepository.FindById(storageId)
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
		return Fail(c, -1, "非法请求 :(")
	}
	if strings.Contains(remoteFile, "../") {
		return Fail(c, -1, "非法请求 :(")
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
	return Success(c, nil)
}

func StorageMkDirEndpoint(c echo.Context) error {
	storageId := c.Param("storageId")
	if err := PermissionCheck(c, storageId); err != nil {
		return err
	}
	remoteDir := c.QueryParam("dir")
	return StorageMkDir(c, remoteDir, storageId)
}

func StorageMkDir(c echo.Context, remoteDir, storageId string) error {
	drivePath := storageService.GetBaseDrivePath()
	if strings.Contains(remoteDir, "../") {
		return Fail(c, -1, ":) 非法请求")
	}
	if err := os.MkdirAll(path.Join(path.Join(drivePath, storageId), remoteDir), os.ModePerm); err != nil {
		return err
	}
	return Success(c, nil)
}

func StorageRmEndpoint(c echo.Context) error {
	storageId := c.Param("storageId")
	if err := PermissionCheck(c, storageId); err != nil {
		return err
	}
	// 文件夹或者文件
	file := c.FormValue("file")
	return StorageRm(c, file, storageId)
}

func StorageRm(c echo.Context, file, storageId string) error {
	drivePath := storageService.GetBaseDrivePath()
	if strings.Contains(file, "../") {
		return Fail(c, -1, ":) 非法请求")
	}
	if err := os.RemoveAll(path.Join(path.Join(drivePath, storageId), file)); err != nil {
		return err
	}
	return Success(c, nil)
}

func StorageRenameEndpoint(c echo.Context) error {
	storageId := c.Param("storageId")
	if err := PermissionCheck(c, storageId); err != nil {
		return err
	}
	oldName := c.QueryParam("oldName")
	newName := c.QueryParam("newName")
	return StorageRename(c, oldName, newName, storageId)
}

func StorageRename(c echo.Context, oldName, newName, storageId string) error {
	drivePath := storageService.GetBaseDrivePath()
	if strings.Contains(oldName, "../") {
		return Fail(c, -1, ":) 非法请求")
	}
	if strings.Contains(newName, "../") {
		return Fail(c, -1, ":) 非法请求")
	}
	if err := os.Rename(path.Join(path.Join(drivePath, storageId), oldName), path.Join(path.Join(drivePath, storageId), newName)); err != nil {
		return err
	}
	return Success(c, nil)
}

func StorageEditEndpoint(c echo.Context) error {
	storageId := c.Param("storageId")
	if err := PermissionCheck(c, storageId); err != nil {
		return err
	}
	file := c.FormValue("file")
	fileContent := c.FormValue("fileContent")
	return StorageEdit(c, file, fileContent, storageId)
}

func StorageEdit(c echo.Context, file string, fileContent string, storageId string) error {
	drivePath := storageService.GetBaseDrivePath()
	if strings.Contains(file, "../") {
		return Fail(c, -1, ":) 非法请求")
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
	return Success(c, nil)
}
