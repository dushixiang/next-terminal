package api

import (
	"errors"
	"github.com/labstack/echo/v4"
	"next-terminal/pkg/model"
	"next-terminal/pkg/utils"
	"strconv"
	"strings"
)

func CommandCreateEndpoint(c echo.Context) error {
	var item model.Command
	if err := c.Bind(&item); err != nil {
		return err
	}

	account, _ := GetCurrentAccount(c)
	item.Owner = account.ID
	item.ID = utils.UUID()
	item.Created = utils.NowJsonTime()

	if err := model.CreateNewCommand(&item); err != nil {
		return err
	}

	return Success(c, item)
}

func CommandPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	name := c.QueryParam("name")
	content := c.QueryParam("content")
	account, _ := GetCurrentAccount(c)

	order := c.QueryParam("order")
	field := c.QueryParam("field")

	items, total, err := model.FindPageCommand(pageIndex, pageSize, name, content, order, field, account)
	if err != nil {
		return err
	}

	return Success(c, H{
		"total": total,
		"items": items,
	})
}

func CommandUpdateEndpoint(c echo.Context) error {
	id := c.Param("id")
	if err := PreCheckCommandPermission(c, id); err != nil {
		return err
	}

	var item model.Command
	if err := c.Bind(&item); err != nil {
		return err
	}

	model.UpdateCommandById(&item, id)

	return Success(c, nil)
}

func CommandDeleteEndpoint(c echo.Context) error {
	id := c.Param("id")
	split := strings.Split(id, ",")
	for i := range split {
		if err := PreCheckCommandPermission(c, split[i]); err != nil {
			return err
		}
		if err := model.DeleteCommandById(split[i]); err != nil {
			return err
		}
		// 删除资产与用户的关系
		if err := model.DeleteResourceSharerByResourceId(split[i]); err != nil {
			return err
		}
	}
	return Success(c, nil)
}

func CommandGetEndpoint(c echo.Context) (err error) {
	id := c.Param("id")

	if err := PreCheckCommandPermission(c, id); err != nil {
		return err
	}

	var item model.Command
	if item, err = model.FindCommandById(id); err != nil {
		return err
	}
	return Success(c, item)
}

func CommandChangeOwnerEndpoint(c echo.Context) (err error) {
	id := c.Param("id")

	if err := PreCheckCommandPermission(c, id); err != nil {
		return err
	}

	owner := c.QueryParam("owner")
	model.UpdateCommandById(&model.Command{Owner: owner}, id)
	return Success(c, "")
}

func PreCheckCommandPermission(c echo.Context, id string) error {
	item, err := model.FindCommandById(id)
	if err != nil {
		return err
	}

	if !HasPermission(c, item.Owner) {
		return errors.New("permission denied")
	}
	return nil
}
