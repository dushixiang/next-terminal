package api

import (
	"context"
	"strconv"
	"strings"

	"next-terminal/server/common/maps"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/service"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
)

type LoginPolicyApi struct{}

func (api LoginPolicyApi) PagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	name := c.QueryParam("name")
	userId := c.QueryParam("userId")

	order := c.QueryParam("order")
	field := c.QueryParam("field")

	items, total, err := repository.LoginPolicyRepository.Find(context.TODO(), pageIndex, pageSize, name, userId, order, field)
	if err != nil {
		return err
	}

	return Success(c, maps.Map{
		"total": total,
		"items": items,
	})
}

func (api LoginPolicyApi) GetEndpoint(c echo.Context) error {
	id := c.Param("id")

	item, err := service.LoginPolicyService.FindById(context.Background(), id)
	if err != nil {
		return err
	}

	return Success(c, item)
}

func (api LoginPolicyApi) CreateEndpoint(c echo.Context) error {
	var item model.LoginPolicy
	if err := c.Bind(&item); err != nil {
		return err
	}
	item.ID = utils.UUID()

	if err := service.LoginPolicyService.Create(context.Background(), &item); err != nil {
		return err
	}
	return Success(c, "")
}

func (api LoginPolicyApi) DeleteEndpoint(c echo.Context) error {
	ids := c.Param("id")
	split := strings.Split(ids, ",")
	if err := service.LoginPolicyService.DeleteByIds(context.Background(), split); err != nil {
		return err
	}
	return Success(c, nil)
}

func (api LoginPolicyApi) UpdateEndpoint(c echo.Context) error {
	id := c.Param("id")
	var item model.LoginPolicy
	if err := c.Bind(&item); err != nil {
		return err
	}

	if err := service.LoginPolicyService.UpdateById(context.Background(), &item, id); err != nil {
		return err
	}
	return Success(c, "")
}

func (api LoginPolicyApi) GetUserPageEndpoint(c echo.Context) error {
	id := c.Param("id")
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	username := c.QueryParam("username")
	nickname := c.QueryParam("nickname")
	mail := c.QueryParam("mail")

	order := c.QueryParam("order")
	field := c.QueryParam("field")

	items, total, err := repository.UserRepository.Find(context.TODO(), pageIndex, pageSize, username, nickname, mail, "", id, order, field)
	if err != nil {
		return err
	}

	return Success(c, maps.Map{
		"total": total,
		"items": items,
	})
}

func (api LoginPolicyApi) BindEndpoint(c echo.Context) error {
	var items []model.LoginPolicyUserRef
	if err := c.Bind(&items); err != nil {
		return err
	}
	id := c.Param("id")
	if err := service.LoginPolicyService.Bind(context.Background(), id, items); err != nil {
		return err
	}
	return Success(c, "")
}

func (api LoginPolicyApi) UnbindEndpoint(c echo.Context) error {
	var items []model.LoginPolicyUserRef
	if err := c.Bind(&items); err != nil {
		return err
	}
	id := c.Param("id")
	if err := service.LoginPolicyService.Unbind(context.Background(), id, items); err != nil {
		return err
	}
	return Success(c, "")
}

func (api LoginPolicyApi) GetUserIdEndpoint(c echo.Context) error {
	id := c.Param("id")
	refs, err := repository.LoginPolicyUserRefRepository.FindByLoginPolicyId(context.Background(), id)
	if err != nil {
		return err
	}
	var ids = make([]string, 0)
	for _, ref := range refs {
		ids = append(ids, ref.UserId)
	}

	return Success(c, ids)
}
