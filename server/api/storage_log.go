package api

import (
	"context"
	"github.com/labstack/echo/v4"
	"next-terminal/server/common/maps"
	"next-terminal/server/repository"
	"strconv"
)

type StorageLogApi struct {
}

func (api StorageLogApi) PagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	assetId := c.QueryParam("assetId")
	userId := c.QueryParam("userId")
	action := c.QueryParam("action")

	order := c.QueryParam("order")
	field := c.QueryParam("field")

	items, total, err := repository.StorageLogRepository.Find(context.TODO(), pageIndex, pageSize, assetId, userId, action, order, field)
	if err != nil {
		return err
	}

	return Success(c, maps.Map{
		"total": total,
		"items": items,
	})
}

func (api StorageLogApi) DeleteEndpoint(c echo.Context) error {
	id := c.Param("id")
	if err := repository.StorageLogRepository.DeleteById(context.Background(), id); err != nil {
		return err
	}
	return Success(c, nil)
}

func (api StorageLogApi) ClearEndpoint(c echo.Context) error {
	if err := repository.StorageLogRepository.DeleteAll(context.Background()); err != nil {
		return err
	}
	return Success(c, nil)
}
