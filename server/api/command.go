package api

import (
	"errors"
	"strconv"
	"strings"

	"next-terminal/server/model"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
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

	if err := commandRepository.Create(&item); err != nil {
		return err
	}

	return Success(c, item)
}

func CommandAllEndpoint(c echo.Context) error {
	account, _ := GetCurrentAccount(c)
	items, _ := commandRepository.FindByUser(account)
	return Success(c, items)
}

func CommandPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	name := c.QueryParam("name")
	content := c.QueryParam("content")
	account, _ := GetCurrentAccount(c)

	order := c.QueryParam("order")
	field := c.QueryParam("field")

	items, total, err := commandRepository.Find(pageIndex, pageSize, name, content, order, field, account)
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

	if err := commandRepository.UpdateById(&item, id); err != nil {
		return err
	}

	return Success(c, nil)
}

func CommandDeleteEndpoint(c echo.Context) error {
	id := c.Param("id")
	split := strings.Split(id, ",")
	for i := range split {
		if err := PreCheckCommandPermission(c, split[i]); err != nil {
			return err
		}
		if err := commandRepository.DeleteById(split[i]); err != nil {
			return err
		}
		// 删除资产与用户的关系
		if err := resourceSharerRepository.DeleteResourceSharerByResourceId(split[i]); err != nil {
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
	if item, err = commandRepository.FindById(id); err != nil {
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
	if err := commandRepository.UpdateById(&model.Command{Owner: owner}, id); err != nil {
		return err
	}
	return Success(c, "")
}

func PreCheckCommandPermission(c echo.Context, id string) error {
	item, err := commandRepository.FindById(id)
	if err != nil {
		return err
	}

	if !HasPermission(c, item.Owner) {
		return errors.New("permission denied")
	}
	return nil
}
