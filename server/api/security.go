package api

import (
	"strconv"
	"strings"

	"next-terminal/server/global"
	"next-terminal/server/model"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
)

func SecurityCreateEndpoint(c echo.Context) error {
	var item model.AccessSecurity
	if err := c.Bind(&item); err != nil {
		return err
	}

	item.ID = utils.UUID()
	item.Source = "管理员添加"

	if err := accessSecurityRepository.Create(&item); err != nil {
		return err
	}
	// 更新内存中的安全规则
	if err := ReloadAccessSecurity(); err != nil {
		return err
	}
	return Success(c, "")
}

func ReloadAccessSecurity() error {
	rules, err := accessSecurityRepository.FindAllAccessSecurities()
	if err != nil {
		return err
	}
	if len(rules) > 0 {
		var securities []*global.Security
		for i := 0; i < len(rules); i++ {
			rule := global.Security{
				IP:   rules[i].IP,
				Rule: rules[i].Rule,
			}
			securities = append(securities, &rule)
		}
		global.Securities = securities
	}
	return nil
}

func SecurityPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	ip := c.QueryParam("ip")
	rule := c.QueryParam("rule")

	order := c.QueryParam("order")
	field := c.QueryParam("field")

	items, total, err := accessSecurityRepository.Find(pageIndex, pageSize, ip, rule, order, field)
	if err != nil {
		return err
	}

	return Success(c, H{
		"total": total,
		"items": items,
	})
}

func SecurityUpdateEndpoint(c echo.Context) error {
	id := c.Param("id")

	var item model.AccessSecurity
	if err := c.Bind(&item); err != nil {
		return err
	}

	if err := accessSecurityRepository.UpdateById(&item, id); err != nil {
		return err
	}
	// 更新内存中的安全规则
	if err := ReloadAccessSecurity(); err != nil {
		return err
	}
	return Success(c, nil)
}

func SecurityDeleteEndpoint(c echo.Context) error {
	ids := c.Param("id")

	split := strings.Split(ids, ",")
	for i := range split {
		jobId := split[i]
		if err := accessSecurityRepository.DeleteById(jobId); err != nil {
			return err
		}
	}
	// 更新内存中的安全规则
	if err := ReloadAccessSecurity(); err != nil {
		return err
	}
	return Success(c, nil)
}

func SecurityGetEndpoint(c echo.Context) error {
	id := c.Param("id")

	item, err := accessSecurityRepository.FindById(id)
	if err != nil {
		return err
	}

	return Success(c, item)
}
