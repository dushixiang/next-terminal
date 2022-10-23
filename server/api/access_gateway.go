package api

import (
	"context"
	"next-terminal/server/common"
	"next-terminal/server/common/maps"
	"strconv"
	"strings"

	"next-terminal/server/global/gateway"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/service"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
)

type AccessGatewayApi struct{}

func (api AccessGatewayApi) AccessGatewayCreateEndpoint(c echo.Context) error {
	var item model.AccessGateway
	if err := c.Bind(&item); err != nil {
		return err
	}

	item.ID = utils.UUID()
	item.Created = common.NowJsonTime()

	if err := repository.GatewayRepository.Create(context.TODO(), &item); err != nil {
		return err
	}
	// 连接网关
	service.GatewayService.ReLoad(&item)
	return Success(c, "")
}

func (api AccessGatewayApi) AccessGatewayAllEndpoint(c echo.Context) error {
	gateways, err := repository.GatewayRepository.FindAll(context.TODO())
	if err != nil {
		return err
	}
	items := make([]maps.Map, len(gateways))
	for i, e := range gateways {
		items[i] = maps.Map{
			"id":   e.ID,
			"name": e.Name,
		}
	}
	return Success(c, items)
}

func (api AccessGatewayApi) AccessGatewayPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	ip := c.QueryParam("ip")
	name := c.QueryParam("name")

	order := c.QueryParam("order")
	field := c.QueryParam("field")

	items, total, err := repository.GatewayRepository.Find(context.TODO(), pageIndex, pageSize, ip, name, order, field)
	if err != nil {
		return err
	}
	for i := 0; i < len(items); i++ {
		g := gateway.GlobalGatewayManager.GetById(items[i].ID)
		if g != nil {
			items[i].Connected = g.Connected
			items[i].Message = g.Message
		}
	}

	return Success(c, maps.Map{
		"total": total,
		"items": items,
	})
}

func (api AccessGatewayApi) AccessGatewayUpdateEndpoint(c echo.Context) error {
	id := c.Param("id")

	var item model.AccessGateway
	if err := c.Bind(&item); err != nil {
		return err
	}

	if err := repository.GatewayRepository.UpdateById(context.TODO(), &item, id); err != nil {
		return err
	}
	service.GatewayService.ReLoad(&item)
	return Success(c, nil)
}

func (api AccessGatewayApi) AccessGatewayDeleteEndpoint(c echo.Context) error {
	ids := c.Param("id")
	split := strings.Split(ids, ",")
	for i := range split {
		id := split[i]
		if err := repository.GatewayRepository.DeleteById(context.TODO(), id); err != nil {
			return err
		}
		service.GatewayService.DisconnectById(id)
	}
	return Success(c, nil)
}

func (api AccessGatewayApi) AccessGatewayGetEndpoint(c echo.Context) error {
	id := c.Param("id")

	item, err := repository.GatewayRepository.FindById(context.TODO(), id)
	if err != nil {
		return err
	}

	return Success(c, item)
}
