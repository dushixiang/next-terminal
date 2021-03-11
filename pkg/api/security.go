package api

import (
	"github.com/labstack/echo/v4"
	"next-terminal/pkg/global"
	"next-terminal/pkg/model"
	"next-terminal/pkg/utils"
	"strconv"
	"strings"
)

func SecurityCreateEndpoint(c echo.Context) error {
	var item model.AccessSecurity
	if err := c.Bind(&item); err != nil {
		return err
	}

	item.ID = utils.UUID()
	item.Source = "管理员添加"

	if err := model.CreateNewSecurity(&item); err != nil {
		return err
	}
	// 更新内存中的安全规则
	if err := ReloadAccessSecurity(); err != nil {
		return err
	}
	return Success(c, "")
}

func ReloadAccessSecurity() error {
	rules, err := model.FindAllAccessSecurities()
	if err != nil {
		return err
	}
	if rules != nil && len(rules) > 0 {
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

	items, total, err := model.FindPageSecurity(pageIndex, pageSize, ip, rule, order, field)
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

	if err := model.UpdateSecurityById(&item, id); err != nil {
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
		if err := model.DeleteSecurityById(jobId); err != nil {
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

	item, err := model.FindSecurityById(id)
	if err != nil {
		return err
	}

	return Success(c, item)
}
