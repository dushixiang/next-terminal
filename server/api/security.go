package api

import (
	"context"
	"next-terminal/server/common/maps"
	"strconv"
	"strings"

	"next-terminal/server/global/security"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
)

type SecurityApi struct{}

func (api SecurityApi) SecurityCreateEndpoint(c echo.Context) error {
	var item model.AccessSecurity
	if err := c.Bind(&item); err != nil {
		return err
	}

	item.ID = utils.UUID()
	item.Source = "管理员添加"

	if err := repository.SecurityRepository.Create(context.TODO(), &item); err != nil {
		return err
	}
	// 更新内存中的安全规则
	rule := &security.Security{
		ID:       item.ID,
		IP:       item.IP,
		Rule:     item.Rule,
		Priority: item.Priority,
	}
	security.GlobalSecurityManager.Add(rule)

	return Success(c, "")
}

func (api SecurityApi) SecurityPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	ip := c.QueryParam("ip")
	rule := c.QueryParam("rule")

	order := c.QueryParam("order")
	field := c.QueryParam("field")

	items, total, err := repository.SecurityRepository.Find(context.TODO(), pageIndex, pageSize, ip, rule, order, field)
	if err != nil {
		return err
	}

	return Success(c, maps.Map{
		"total": total,
		"items": items,
	})
}

func (api SecurityApi) SecurityUpdateEndpoint(c echo.Context) error {
	id := c.Param("id")

	var item model.AccessSecurity
	if err := c.Bind(&item); err != nil {
		return err
	}

	if err := repository.SecurityRepository.UpdateById(context.TODO(), &item, id); err != nil {
		return err
	}
	// 更新内存中的安全规则
	security.GlobalSecurityManager.Del(id)
	rule := &security.Security{
		ID:       item.ID,
		IP:       item.IP,
		Rule:     item.Rule,
		Priority: item.Priority,
	}
	security.GlobalSecurityManager.Add(rule)

	return Success(c, nil)
}

func (api SecurityApi) SecurityDeleteEndpoint(c echo.Context) error {
	ids := c.Param("id")

	split := strings.Split(ids, ",")
	for i := range split {
		id := split[i]
		if err := repository.SecurityRepository.DeleteById(context.TODO(), id); err != nil {
			return err
		}
		// 更新内存中的安全规则
		security.GlobalSecurityManager.Del(id)
	}

	return Success(c, nil)
}

func (api SecurityApi) SecurityGetEndpoint(c echo.Context) error {
	id := c.Param("id")

	item, err := repository.SecurityRepository.FindById(context.TODO(), id)
	if err != nil {
		return err
	}

	return Success(c, item)
}
