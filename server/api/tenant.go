package api

import (
	"context"
	"next-terminal/server/common"
	"next-terminal/server/common/maps"
	"strconv"
	"strings"

	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
)

type TenantApi struct{}

func (api TenantApi) AllEndpoint(c echo.Context) error {
	items, err := repository.TenantRepository.FindAll(context.TODO())
	if err != nil {
		return err
	}
	return Success(c, items)
}

func (api TenantApi) PagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	name := c.QueryParam("name")

	order := c.QueryParam("order")
	field := c.QueryParam("field")

	items, total, err := repository.TenantRepository.Find(context.TODO(), pageIndex, pageSize, name, order, field)
	if err != nil {
		return err
	}

	return Success(c, maps.Map{
		"total": total,
		"items": items,
	})
}

func (api TenantApi) CreateEndpoint(c echo.Context) error {
	var item model.Tenant
	if err := c.Bind(&item); err != nil {
		return err
	}
	item.ID = utils.UUID()
	item.Created = common.NowJsonTime()

	if err := repository.TenantRepository.Create(context.TODO(), &item); err != nil {
		return err
	}
	return Success(c, "")
}

func (api TenantApi) DeleteEndpoint(c echo.Context) error {
	ids := c.Param("id")
	split := strings.Split(ids, ",")
	for i := range split {
		id := split[i]
		if err := repository.TenantRepository.DeleteById(context.TODO(), id); err != nil {
			return err
		}
	}
	return Success(c, nil)
}

func (api TenantApi) UpdateEndpoint(c echo.Context) error {
	id := c.Param("id")
	var item model.Tenant
	if err := c.Bind(&item); err != nil {
		return err
	}

	if err := repository.TenantRepository.UpdateById(context.TODO(), &item, id); err != nil {
		return err
	}
	return Success(c, "")
}
