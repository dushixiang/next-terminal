package worker

import (
	"context"
	"errors"
	"gorm.io/gorm"
	"next-terminal/server/common/nt"
	"strconv"
	"strings"

	"next-terminal/server/api/abi"
	"next-terminal/server/common"
	"next-terminal/server/common/maps"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
)

type WorkCommandApi struct {
	abi.Abi
}

func (api WorkCommandApi) CommandCreateEndpoint(c echo.Context) error {
	var item model.Command
	if err := c.Bind(&item); err != nil {
		return err
	}

	account, _ := api.GetCurrentAccount(c)
	item.Owner = account.ID
	item.ID = utils.UUID()
	item.Created = common.NowJsonTime()

	if err := repository.CommandRepository.Create(context.TODO(), &item); err != nil {
		return err
	}

	return api.Success(c, item)
}

func (api WorkCommandApi) CommandAllEndpoint(c echo.Context) error {
	account, _ := api.GetCurrentAccount(c)
	userId := account.ID
	items, err := repository.CommandRepository.FindByUserId(context.Background(), userId)
	if err != nil {
		return err
	}
	return api.Success(c, items)
}

func (api WorkCommandApi) CommandPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	name := c.QueryParam("name")
	content := c.QueryParam("content")
	order := c.QueryParam("order")
	field := c.QueryParam("field")

	account, _ := api.GetCurrentAccount(c)
	userId := account.ID

	items, total, err := repository.CommandRepository.WorkerFind(context.TODO(), pageIndex, pageSize, name, content, order, field, userId)
	if err != nil {
		return err
	}

	return api.Success(c, maps.Map{
		"total": total,
		"items": items,
	})
}

func (api WorkCommandApi) CommandUpdateEndpoint(c echo.Context) error {
	id := c.Param("id")

	if !api.checkPermission(c, id) {
		return nt.ErrPermissionDenied
	}

	var item model.Command
	if err := c.Bind(&item); err != nil {
		return err
	}

	if err := repository.CommandRepository.UpdateById(context.TODO(), &item, id); err != nil {
		return err
	}

	return api.Success(c, nil)
}

func (api WorkCommandApi) CommandDeleteEndpoint(c echo.Context) error {
	id := c.Param("id")
	split := strings.Split(id, ",")
	for i := range split {
		if !api.checkPermission(c, id) {
			return nt.ErrPermissionDenied
		}
		if err := repository.CommandRepository.DeleteById(context.TODO(), split[i]); err != nil {
			return err
		}
	}
	return api.Success(c, nil)
}

func (api WorkCommandApi) CommandGetEndpoint(c echo.Context) (err error) {
	id := c.Param("id")
	if !api.checkPermission(c, id) {
		return nt.ErrPermissionDenied
	}
	var item model.Command
	if item, err = repository.CommandRepository.FindById(context.TODO(), id); err != nil {
		return err
	}
	return api.Success(c, item)
}

func (api WorkCommandApi) checkPermission(c echo.Context, commandId string) bool {
	command, err := repository.CommandRepository.FindById(context.Background(), commandId)
	if err != nil {
		if errors.Is(gorm.ErrRecordNotFound, err) {
			return true
		}
		return false
	}
	account, _ := api.GetCurrentAccount(c)
	userId := account.ID

	return command.Owner == userId
}
