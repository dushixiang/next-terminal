package api

import (
	"context"
	"next-terminal/server/common"
	"next-terminal/server/common/maps"
	"next-terminal/server/service"
	"strconv"
	"strings"

	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
)

type RoleApi struct{}

func (api RoleApi) AllEndpoint(c echo.Context) error {
	items, err := repository.RoleRepository.FindAll(context.TODO())
	if err != nil {
		return err
	}
	return Success(c, items)
}

func (api RoleApi) PagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	name := c.QueryParam("name")
	_type := c.QueryParam("type")

	order := c.QueryParam("order")
	field := c.QueryParam("field")

	items, total, err := repository.RoleRepository.Find(context.TODO(), pageIndex, pageSize, name, _type, order, field)
	if err != nil {
		return err
	}

	return Success(c, maps.Map{
		"total": total,
		"items": items,
	})
}

func (api RoleApi) GetEndpoint(c echo.Context) error {
	id := c.Param("id")

	item, err := service.RoleService.FindById(context.Background(), id)
	if err != nil {
		return err
	}

	return Success(c, item)
}

func (api RoleApi) CreateEndpoint(c echo.Context) error {
	var item model.Role
	if err := c.Bind(&item); err != nil {
		return err
	}
	item.ID = utils.UUID()
	item.Created = common.NowJsonTime()
	item.Deletable = true
	item.Modifiable = true
	item.Type = "new"

	if err := service.RoleService.Create(context.Background(), &item); err != nil {
		return err
	}
	return Success(c, "")
}

func (api RoleApi) DeleteEndpoint(c echo.Context) error {
	ids := c.Param("id")
	split := strings.Split(ids, ",")
	if err := service.RoleService.DeleteByIds(context.Background(), split, false); err != nil {
		return err
	}
	return Success(c, nil)
}

func (api RoleApi) UpdateEndpoint(c echo.Context) error {
	id := c.Param("id")
	var item model.Role
	if err := c.Bind(&item); err != nil {
		return err
	}

	if err := service.RoleService.UpdateById(context.Background(), &item, id, false); err != nil {
		return err
	}
	return Success(c, "")
}

func (api RoleApi) TreeMenus(c echo.Context) error {
	return Success(c, service.MenuService.GetTreeMenus())
}
