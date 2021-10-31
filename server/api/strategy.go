package api

import (
	"strconv"
	"strings"

	"next-terminal/server/model"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
)

func StrategyAllEndpoint(c echo.Context) error {
	items, err := strategyRepository.FindAll()
	if err != nil {
		return err
	}
	return Success(c, items)
}

func StrategyPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	name := c.QueryParam("name")

	order := c.QueryParam("order")
	field := c.QueryParam("field")

	items, total, err := strategyRepository.Find(pageIndex, pageSize, name, order, field)
	if err != nil {
		return err
	}

	return Success(c, H{
		"total": total,
		"items": items,
	})
}

func StrategyCreateEndpoint(c echo.Context) error {
	var item model.Strategy
	if err := c.Bind(&item); err != nil {
		return err
	}
	item.ID = utils.UUID()
	item.Created = utils.NowJsonTime()

	if err := strategyRepository.Create(&item); err != nil {
		return err
	}
	return Success(c, "")
}

func StrategyDeleteEndpoint(c echo.Context) error {
	ids := c.Param("id")
	split := strings.Split(ids, ",")
	for i := range split {
		id := split[i]
		if err := strategyRepository.DeleteById(id); err != nil {
			return err
		}
	}
	return Success(c, nil)
}

func StrategyUpdateEndpoint(c echo.Context) error {
	id := c.Param("id")
	var item model.Strategy
	if err := c.Bind(&item); err != nil {
		return err
	}

	if err := strategyRepository.UpdateById(&item, id); err != nil {
		return err
	}
	return Success(c, "")
}
