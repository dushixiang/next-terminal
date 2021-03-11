package api

import (
	"bufio"
	"encoding/csv"
	"encoding/json"
	"errors"
	"github.com/labstack/echo/v4"
	"next-terminal/pkg/constant"
	"next-terminal/pkg/model"
	"next-terminal/pkg/utils"
	"strconv"
	"strings"
)

func AssetCreateEndpoint(c echo.Context) error {
	m := echo.Map{}
	if err := c.Bind(&m); err != nil {
		return err
	}

	data, _ := json.Marshal(m)
	var item model.Asset
	if err := json.Unmarshal(data, &item); err != nil {
		return err
	}

	account, _ := GetCurrentAccount(c)
	item.Owner = account.ID
	item.ID = utils.UUID()
	item.Created = utils.NowJsonTime()

	if err := model.CreateNewAsset(&item); err != nil {
		return err
	}

	if err := model.UpdateAssetAttributes(item.ID, item.Protocol, m); err != nil {
		return err
	}

	// 创建后自动检测资产是否存活
	go func() {
		active := utils.Tcping(item.IP, item.Port)
		model.UpdateAssetActiveById(active, item.ID)
	}()

	return Success(c, item)
}

func AssetImportEndpoint(c echo.Context) error {
	account, _ := GetCurrentAccount(c)

	file, err := c.FormFile("file")
	if err != nil {
		return err
	}

	src, err := file.Open()
	if err != nil {
		return err
	}

	defer src.Close()
	reader := csv.NewReader(bufio.NewReader(src))
	records, err := reader.ReadAll()
	if err != nil {
		return err
	}

	total := len(records)
	if total == 0 {
		return errors.New("csv数据为空")
	}

	var successCount = 0
	var errorCount = 0
	m := echo.Map{}

	for i := 0; i < total; i++ {
		record := records[i]
		if len(record) >= 9 {
			port, _ := strconv.Atoi(record[3])
			asset := model.Asset{
				ID:          utils.UUID(),
				Name:        record[0],
				Protocol:    record[1],
				IP:          record[2],
				Port:        port,
				AccountType: constant.Custom,
				Username:    record[4],
				Password:    record[5],
				PrivateKey:  record[6],
				Passphrase:  record[7],
				Description: record[8],
				Created:     utils.NowJsonTime(),
				Owner:       account.ID,
			}

			err := model.CreateNewAsset(&asset)
			if err != nil {
				errorCount++
				m[strconv.Itoa(i)] = err.Error()
			} else {
				successCount++
				// 创建后自动检测资产是否存活
				go func() {
					active := utils.Tcping(asset.IP, asset.Port)
					model.UpdateAssetActiveById(active, asset.ID)
				}()
			}
		}
	}

	return Success(c, echo.Map{
		"successCount": successCount,
		"errorCount":   errorCount,
		"data":         m,
	})
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
	ip := c.QueryParam("ip")

	order := c.QueryParam("order")
	field := c.QueryParam("field")

	account, _ := GetCurrentAccount(c)
	items, total, err := model.FindPageAsset(pageIndex, pageSize, name, protocol, tags, account, owner, sharer, userGroupId, ip, order, field)
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

	m := echo.Map{}
	if err := c.Bind(&m); err != nil {
		return err
	}

	data, _ := json.Marshal(m)
	var item model.Asset
	if err := json.Unmarshal(data, &item); err != nil {
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
	if err := model.UpdateAssetAttributes(id, item.Protocol, m); err != nil {
		return err
	}

	return Success(c, nil)
}

func AssetGetAttributeEndpoint(c echo.Context) error {

	assetId := c.Param("id")
	if err := PreCheckAssetPermission(c, assetId); err != nil {
		return err
	}

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
		if err := model.DeleteAssetById(split[i]); err != nil {
			return err
		}
		// 删除资产与用户的关系
		if err := model.DeleteResourceSharerByResourceId(split[i]); err != nil {
			return err
		}
	}

	return Success(c, nil)
}

func AssetGetEndpoint(c echo.Context) (err error) {
	id := c.Param("id")
	if err := PreCheckAssetPermission(c, id); err != nil {
		return err
	}

	var item model.Asset
	if item, err = model.FindAssetById(id); err != nil {
		return err
	}
	attributeMap, err := model.FindAssetAttrMapByAssetId(id)
	if err != nil {
		return err
	}
	itemMap := utils.StructToMap(item)
	for key := range attributeMap {
		itemMap[key] = attributeMap[key]
	}

	return Success(c, itemMap)
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
