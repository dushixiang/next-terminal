package api

import (
	"bufio"
	"context"
	"encoding/csv"
	"errors"
	"strconv"
	"strings"

	"next-terminal/server/common/maps"
	"next-terminal/server/common/nt"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/service"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
)

type AssetApi struct{}

func (assetApi AssetApi) AssetCreateEndpoint(c echo.Context) error {
	m := maps.Map{}
	if err := c.Bind(&m); err != nil {
		return err
	}

	account, _ := GetCurrentAccount(c)
	m["owner"] = account.ID

	if _, err := service.AssetService.Create(context.TODO(), m); err != nil {
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
			asset := maps.Map{
				"id":          utils.UUID(),
				"name":        record[0],
				"protocol":    record[1],
				"ip":          record[2],
				"port":        port,
				"accountType": nt.Custom,
				"username":    record[4],
				"password":    record[5],
				"privateKey":  record[6],
				"passphrase":  record[7],
				"Description": record[8],
				"owner":       account.ID,
			}

			if record[6] != "" {
				asset["accountType"] = nt.PrivateKey
			}

			if len(record) >= 10 {
				tags := strings.ReplaceAll(record[9], "|", ",")
				asset["tags"] = tags
			}

			_, err := service.AssetService.Create(context.Background(), asset)
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
	ip := c.QueryParam("ip")
	port := c.QueryParam("port")
	active := c.QueryParam("active")

	order := c.QueryParam("order")
	field := c.QueryParam("field")

	items, total, err := repository.AssetRepository.Find(context.Background(), pageIndex, pageSize, name, protocol, tags, ip, port, active, order, field)
	if err != nil {
		return err
	}

	return Success(c, maps.Map{
		"total": total,
		"items": items,
	})
}

func (assetApi AssetApi) AssetAllEndpoint(c echo.Context) error {
	protocol := c.QueryParam("protocol")
	assets, err := repository.AssetRepository.FindByProtocol(context.TODO(), protocol)
	if err != nil {
		return err
	}
	items := make([]maps.Map, len(assets))
	for i, e := range assets {
		items[i] = maps.Map{
			"id":   e.ID,
			"name": e.Name,
		}
	}
	return Success(c, items)
}

func (assetApi AssetApi) AssetUpdateEndpoint(c echo.Context) error {
	id := c.Param("id")
	m := maps.Map{}
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
		if err := service.AssetService.DeleteById(split[i]); err != nil {
			return err
		}
	}

	return Success(c, nil)
}

func (assetApi AssetApi) AssetGetEndpoint(c echo.Context) (err error) {
	id := c.Param("id")

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

	active, err := service.AssetService.CheckStatus(&item, item.IP, item.Port)

	var message = ""
	if err != nil {
		message = err.Error()
	}
	if err := repository.AssetRepository.UpdateActiveById(context.TODO(), active, message, item.ID); err != nil {
		return err
	}

	return Success(c, maps.Map{
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

	owner := c.QueryParam("owner")
	if err := repository.AssetRepository.UpdateById(context.TODO(), &model.Asset{Owner: owner}, id); err != nil {
		return err
	}
	return Success(c, "")
}
