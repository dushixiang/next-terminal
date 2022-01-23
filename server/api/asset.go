package api

import (
	"bufio"
	"context"
	"encoding/csv"
	"errors"
	"strconv"
	"strings"

	"next-terminal/server/constant"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/service"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
)

type AssetApi struct{}

func (assetApi AssetApi) AssetCreateEndpoint(c echo.Context) error {
	m := echo.Map{}
	if err := c.Bind(&m); err != nil {
		return err
	}

	account, _ := GetCurrentAccount(c)
	m["owner"] = account.ID

	if _, err := service.AssetService.Create(m); err != nil {
		return err
	}

	return Success(c, nil)
}

func (assetApi AssetApi) AssetImportEndpoint(c echo.Context) error {
	account, _ := GetCurrentAccount(c)

	file, err := c.FormFile("file")
	if err != nil {
		return err
	}

	src, err := file.Open()
	if err != nil {
		return err
	}

	defer func() {
		_ = src.Close()
	}()
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
				Active:      true,
			}

			if len(record) >= 10 {
				tags := strings.ReplaceAll(record[9], "|", ",")
				asset.Tags = tags
			}

			err := repository.AssetRepository.Create(context.TODO(), &asset)
			if err != nil {
				errorCount++
				m[strconv.Itoa(i)] = err.Error()
			} else {
				successCount++
			}
		}
	}

	return Success(c, echo.Map{
		"successCount": successCount,
		"errorCount":   errorCount,
		"data":         m,
	})
}

func (assetApi AssetApi) AssetPagingEndpoint(c echo.Context) error {
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

	items, total, err := repository.AssetRepository.Find(context.TODO(), pageIndex, pageSize, name, protocol, tags, account, owner, sharer, userGroupId, ip, order, field)
	if err != nil {
		return err
	}

	return Success(c, Map{
		"total": total,
		"items": items,
	})
}

func (assetApi AssetApi) AssetAllEndpoint(c echo.Context) error {
	protocol := c.QueryParam("protocol")
	items, _ := repository.AssetRepository.FindByProtocol(context.TODO(), protocol)
	return Success(c, items)
}

func (assetApi AssetApi) AssetUpdateEndpoint(c echo.Context) error {
	id := c.Param("id")
	if err := assetApi.PreCheckAssetPermission(c, id); err != nil {
		return err
	}

	m := echo.Map{}
	if err := c.Bind(&m); err != nil {
		return err
	}
	if err := service.AssetService.UpdateById(id, m); err != nil {
		return err
	}
	return Success(c, nil)
}

func (assetApi AssetApi) AssetDeleteEndpoint(c echo.Context) error {
	id := c.Param("id")
	split := strings.Split(id, ",")
	for i := range split {
		if err := assetApi.PreCheckAssetPermission(c, split[i]); err != nil {
			return err
		}
		if err := service.AssetService.DeleteById(split[i]); err != nil {
			return err
		}
	}

	return Success(c, nil)
}

func (assetApi AssetApi) AssetGetEndpoint(c echo.Context) (err error) {
	id := c.Param("id")
	if err := assetApi.PreCheckAssetPermission(c, id); err != nil {
		return err
	}

	var item model.Asset
	if item, err = service.AssetService.FindByIdAndDecrypt(context.TODO(), id); err != nil {
		return err
	}
	attributeMap, err := repository.AssetRepository.FindAssetAttrMapByAssetId(context.TODO(), id)
	if err != nil {
		return err
	}
	itemMap := utils.StructToMap(item)
	for key := range attributeMap {
		itemMap[key] = attributeMap[key]
	}

	return Success(c, itemMap)
}

func (assetApi AssetApi) AssetTcpingEndpoint(c echo.Context) (err error) {
	id := c.Param("id")

	var item model.Asset
	if item, err = repository.AssetRepository.FindById(context.TODO(), id); err != nil {
		return err
	}

	active, err := service.AssetService.CheckStatus(item.AccessGatewayId, item.IP, item.Port)

	if item.Active != active {
		if err := repository.AssetRepository.UpdateActiveById(context.TODO(), active, item.ID); err != nil {
			return err
		}
	}

	var message = ""
	if err != nil {
		message = err.Error()
	}

	return Success(c, Map{
		"active":  active,
		"message": message,
	})
}

func (assetApi AssetApi) AssetTagsEndpoint(c echo.Context) (err error) {
	var items []string
	if items, err = repository.AssetRepository.FindTags(context.TODO()); err != nil {
		return err
	}
	return Success(c, items)
}

func (assetApi AssetApi) AssetChangeOwnerEndpoint(c echo.Context) (err error) {
	id := c.Param("id")

	if err := assetApi.PreCheckAssetPermission(c, id); err != nil {
		return err
	}

	owner := c.QueryParam("owner")
	if err := repository.AssetRepository.UpdateById(context.TODO(), &model.Asset{Owner: owner}, id); err != nil {
		return err
	}
	return Success(c, "")
}

func (assetApi AssetApi) PreCheckAssetPermission(c echo.Context, id string) error {
	item, err := repository.AssetRepository.FindById(context.TODO(), id)
	if err != nil {
		return err
	}

	if !HasPermission(c, item.Owner) {
		return errors.New("permission denied")
	}
	return nil
}
