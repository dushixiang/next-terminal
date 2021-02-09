package api

import (
	"errors"
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

	account, _ := GetCurrentAccount(c)
	item.Owner = account.ID
	item.ID = utils.UUID()
	item.Created = utils.NowJsonTime()

	if err := model.CreateNewAsset(&item); err != nil {
		return err
	}

	// 创建后自动检测资产是否存活
	go func() {
		active := utils.Tcping(item.IP, item.Port)
		model.UpdateAssetActiveById(active, item.ID)
	}()

	return Success(c, item)
}

func AssetPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	name := c.QueryParam("name")
	protocol := c.QueryParam("protocol")
	tags := c.QueryParam("tags")
	owner := c.QueryParam("owner")
	sharer := c.QueryParam("sharer")
	userGroupId := c.QueryParam("userGroupId")

	account, _ := GetCurrentAccount(c)
	items, total, err := model.FindPageAsset(pageIndex, pageSize, name, protocol, tags, account, owner, sharer, userGroupId)
	if err != nil {
		return err
	}

	return Success(c, H{
		"total": total,
		"items": items,
	})
}

func AssetAllEndpoint(c echo.Context) error {
	protocol := c.QueryParam("protocol")
	account, _ := GetCurrentAccount(c)
	items, _ := model.FindAssetByConditions(protocol, account)
	return Success(c, items)
}

func AssetUpdateEndpoint(c echo.Context) error {
	id := c.Param("id")
	if err := PreCheckAssetPermission(c, id); err != nil {
		return err
	}

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

	if item.Description == "" {
		item.Description = "-"
	}

	model.UpdateAssetById(&item, id)

	return Success(c, nil)
}

func AssetGetAttributeEndpoint(c echo.Context) error {

	assetId := c.Param("id")
	attributeMap, err := model.FindAssetAttrMapByAssetId(assetId)
	if err != nil {
		return err
	}
	return Success(c, attributeMap)
}

func AssetUpdateAttributeEndpoint(c echo.Context) error {
	m := echo.Map{}
	if err := c.Bind(&m); err != nil {
		return err
	}

	assetId := c.Param("id")
	protocol := c.QueryParam("protocol")
	err := model.UpdateAssetAttributes(assetId, protocol, m)
	if err != nil {
		return err
	}
	return Success(c, "")
}

func AssetDeleteEndpoint(c echo.Context) error {
	id := c.Param("id")
	split := strings.Split(id, ",")
	for i := range split {
		if err := PreCheckAssetPermission(c, split[i]); err != nil {
			return err
		}
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

func AssetChangeOwnerEndpoint(c echo.Context) (err error) {
	id := c.Param("id")

	if err := PreCheckAssetPermission(c, id); err != nil {
		return err
	}

	owner := c.QueryParam("owner")
	model.UpdateAssetById(&model.Asset{Owner: owner}, id)
	return Success(c, "")
}

func PreCheckAssetPermission(c echo.Context, id string) error {
	item, err := model.FindAssetById(id)
	if err != nil {
		return err
	}

	if !HasPermission(c, item.Owner) {
		return errors.New("permission denied")
	}
	return nil
}
