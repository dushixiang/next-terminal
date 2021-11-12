package api

import (
	"strconv"
	"strings"

	"next-terminal/server/model"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
)

func AccessGatewayCreateEndpoint(c echo.Context) error {
	var item model.AccessGateway
	if err := c.Bind(&item); err != nil {
		return err
	}

	item.ID = utils.UUID()
	item.Created = utils.NowJsonTime()

	if err := accessGatewayRepository.Create(&item); err != nil {
		return err
	}
	// 连接网关
	accessGatewayService.ReConnect(&item)
	return Success(c, "")
}

func AccessGatewayAllEndpoint(c echo.Context) error {
	gateways, err := accessGatewayRepository.FindAll()
	if err != nil {
		return err
	}
	var simpleGateways = make([]model.AccessGatewayForPage, 0)
	for i := 0; i < len(gateways); i++ {
		simpleGateways = append(simpleGateways, model.AccessGatewayForPage{ID: gateways[i].ID, Name: gateways[i].Name})
	}
	return Success(c, simpleGateways)
}

func AccessGatewayPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	ip := c.QueryParam("ip")
	name := c.QueryParam("name")

	order := c.QueryParam("order")
	field := c.QueryParam("field")

	items, total, err := accessGatewayRepository.Find(pageIndex, pageSize, ip, name, order, field)
	if err != nil {
		return err
	}
	for i := 0; i < len(items); i++ {
		g, err := accessGatewayService.GetGatewayById(items[i].ID)
		if err != nil {
			return err
		}
		items[i].Connected = g.Connected
		items[i].Message = g.Message
	}

	return Success(c, H{
		"total": total,
		"items": items,
	})
}

func AccessGatewayUpdateEndpoint(c echo.Context) error {
	id := c.Param("id")

	var item model.AccessGateway
	if err := c.Bind(&item); err != nil {
		return err
	}

	if err := accessGatewayRepository.UpdateById(&item, id); err != nil {
		return err
	}
	accessGatewayService.ReConnect(&item)
	return Success(c, nil)
}

func AccessGatewayDeleteEndpoint(c echo.Context) error {
	ids := c.Param("id")
	split := strings.Split(ids, ",")
	for i := range split {
		id := split[i]
		if err := accessGatewayRepository.DeleteById(id); err != nil {
			return err
		}
		accessGatewayService.DisconnectById(id)
	}
	return Success(c, nil)
}

func AccessGatewayGetEndpoint(c echo.Context) error {
	id := c.Param("id")

	item, err := accessGatewayRepository.FindById(id)
	if err != nil {
		return err
	}

	return Success(c, item)
}

func AccessGatewayReconnectEndpoint(c echo.Context) error {
	id := c.Param("id")

	item, err := accessGatewayRepository.FindById(id)
	if err != nil {
		return err
	}
	accessGatewayService.ReConnect(&item)
	return Success(c, "")
}
