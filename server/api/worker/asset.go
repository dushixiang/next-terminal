package worker

import (
	"context"
	"github.com/labstack/echo/v4"
	"next-terminal/server/api/abi"
	"next-terminal/server/common/maps"
	"next-terminal/server/service"
	"strconv"
)

type WorkAssetApi struct {
	abi.Abi
}

func (api WorkAssetApi) PagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	name := c.QueryParam("name")
	protocol := c.QueryParam("protocol")
	tags := c.QueryParam("tags")

	order := c.QueryParam("order")
	field := c.QueryParam("field")
	account, _ := api.GetCurrentAccount(c)

	items, total, err := service.WorkerService.FindMyAssetPaging(pageIndex, pageSize, name, protocol, tags, account.ID, order, field)
	if err != nil {
		return err
	}
	for i := range items {
		items[i].IP = ""
		items[i].Port = 0
	}

	return api.Success(c, maps.Map{
		"total": total,
		"items": items,
	})
}

func (api WorkAssetApi) TagsEndpoint(c echo.Context) (err error) {
	account, _ := api.GetCurrentAccount(c)
	var items []string
	if items, err = service.WorkerService.FindMyAssetTags(context.TODO(), account.ID); err != nil {
		return err
	}
	return api.Success(c, items)
}
