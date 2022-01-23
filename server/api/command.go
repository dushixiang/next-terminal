package api

import (
	"context"
	"errors"
	"strconv"
	"strings"

	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
)

type CommandApi struct{}

func (api CommandApi) CommandCreateEndpoint(c echo.Context) error {
	var item model.Command
	if err := c.Bind(&item); err != nil {
		return err
	}

	account, _ := GetCurrentAccount(c)
	item.Owner = account.ID
	item.ID = utils.UUID()
	item.Created = utils.NowJsonTime()

	if err := repository.CommandRepository.Create(context.TODO(), &item); err != nil {
		return err
	}

	return Success(c, item)
}

func (api CommandApi) CommandAllEndpoint(c echo.Context) error {
	account, _ := GetCurrentAccount(c)
	items, err := repository.CommandRepository.FindByUser(context.TODO(), account)
	if err != nil {
		return err
	}
	return Success(c, items)
}

func (api CommandApi) CommandPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	name := c.QueryParam("name")
	content := c.QueryParam("content")
	account, _ := GetCurrentAccount(c)

	order := c.QueryParam("order")
	field := c.QueryParam("field")

	items, total, err := repository.CommandRepository.Find(context.TODO(), pageIndex, pageSize, name, content, order, field, account)
	if err != nil {
		return err
	}

	return Success(c, Map{
		"total": total,
		"items": items,
	})
}

func (api CommandApi) CommandUpdateEndpoint(c echo.Context) error {
	id := c.Param("id")
	if err := api.PreCheckCommandPermission(c, id); err != nil {
		return err
	}

	var item model.Command
	if err := c.Bind(&item); err != nil {
		return err
	}

	if err := repository.CommandRepository.UpdateById(context.TODO(), &item, id); err != nil {
		return err
	}

	return Success(c, nil)
}

func (api CommandApi) CommandDeleteEndpoint(c echo.Context) error {
	id := c.Param("id")
	split := strings.Split(id, ",")
	for i := range split {
		if err := api.PreCheckCommandPermission(c, split[i]); err != nil {
			return err
		}
		if err := repository.CommandRepository.DeleteById(context.TODO(), split[i]); err != nil {
			return err
		}
	}
	return Success(c, nil)
}

func (api CommandApi) CommandGetEndpoint(c echo.Context) (err error) {
	id := c.Param("id")

	if err := api.PreCheckCommandPermission(c, id); err != nil {
		return err
	}

	var item model.Command
	if item, err = repository.CommandRepository.FindById(context.TODO(), id); err != nil {
		return err
	}
	return Success(c, item)
}

func (api CommandApi) CommandChangeOwnerEndpoint(c echo.Context) (err error) {
	id := c.Param("id")

	if err := api.PreCheckCommandPermission(c, id); err != nil {
		return err
	}

	owner := c.QueryParam("owner")
	if err := repository.CommandRepository.UpdateById(context.TODO(), &model.Command{Owner: owner}, id); err != nil {
		return err
	}
	return Success(c, "")
}

func (api CommandApi) PreCheckCommandPermission(c echo.Context, id string) error {
	item, err := repository.CommandRepository.FindById(context.TODO(), id)
	if err != nil {
		return err
	}

	if !HasPermission(c, item.Owner) {
		return errors.New("permission denied")
	}
	return nil
}
