package api

import (
	"github.com/labstack/echo/v4"
	"next-terminal/pkg/model"
	"next-terminal/pkg/utils"
	"strconv"
	"strings"
)

func AssetCreateEndpoint(c echo.Context) error {
	var item model.Asset
	if err := c.Bind(&item); err != nil {
		return err
	}

	item.ID = utils.UUID()
	item.Created = utils.NowJsonTime()

	if err := model.CreateNewAsset(&item); err != nil {
		return err
	}

	return Success(c, item)
}

func AssetPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	name := c.QueryParam("name")
	protocol := c.QueryParam("protocol")
	tags := c.QueryParam("tags")

	items, total, _ := model.FindPageAsset(pageIndex, pageSize, name, protocol, tags)

	return Success(c, H{
		"total": total,
		"items": items,
	})
}

func AssetAllEndpoint(c echo.Context) error {
	protocol := c.QueryParam("protocol")
	items, _ := model.FindAssetByConditions(protocol)
	return Success(c, items)
}

func AssetUpdateEndpoint(c echo.Context) error {
	id := c.Param("id")

	var item model.Asset
	if err := c.Bind(&item); err != nil {
		return err
	}
	switch item.AccountType {
	case "credential":
		item.Username = "-"
		item.Password = "-"
		item.PrivateKey = "-"
		item.Passphrase = "-"
	case "private-key":
		item.Password = "-"
		item.CredentialId = "-"
		if len(item.Username) == 0 {
			item.Username = "-"
		}
		if len(item.Passphrase) == 0 {
			item.Passphrase = "-"
		}
	case "custom":
		item.PrivateKey = "-"
		item.Passphrase = "-"
		item.CredentialId = "-"
	}

	if len(item.Tags) == 0 {
		item.Tags = "-"
	}

	model.UpdateAssetById(&item, id)

	return Success(c, nil)
}

func AssetDeleteEndpoint(c echo.Context) error {
	id := c.Param("id")
	split := strings.Split(id, ",")
	for i := range split {
		model.DeleteAssetById(split[i])
	}

	return Success(c, nil)
}

func AssetGetEndpoint(c echo.Context) (err error) {
	id := c.Param("id")

	var item model.Asset
	if item, err = model.FindAssetById(id); err != nil {
		return err
	}

	return Success(c, item)
}

func AssetTcpingEndpoint(c echo.Context) (err error) {
	id := c.Param("id")

	var item model.Asset
	if item, err = model.FindAssetById(id); err != nil {
		return err
	}

	active := utils.Tcping(item.IP, item.Port)

	model.UpdateAssetActiveById(active, item.ID)
	return Success(c, active)
}

func AssetTagsEndpoint(c echo.Context) (err error) {
	var items []string
	if items, err = model.FindAssetTags(); err != nil {
		return err
	}
	return Success(c, items)
}
