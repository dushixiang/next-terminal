package api

import (
	"context"
	"next-terminal/server/common/maps"
	"next-terminal/server/model"
	"strconv"
	"strings"

	"next-terminal/server/dto"
	"next-terminal/server/repository"
	"next-terminal/server/service"

	"github.com/labstack/echo/v4"
)

type UserGroupApi struct{}

func (userGroupApi UserGroupApi) UserGroupCreateEndpoint(c echo.Context) error {
	var item model.UserGroup
	if err := c.Bind(&item); err != nil {
		return err
	}

	if _, err := service.UserGroupService.Create(context.TODO(), item.Name, item.Members); err != nil {
		return err
	}

	return Success(c, item)
}

func (userGroupApi UserGroupApi) UserGroupPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	name := c.QueryParam("name")

	order := c.QueryParam("order")
	field := c.QueryParam("field")

	items, total, err := repository.UserGroupRepository.Find(context.TODO(), pageIndex, pageSize, name, order, field)
	if err != nil {
		return err
	}

	return Success(c, maps.Map{
		"total": total,
		"items": items,
	})
}

func (userGroupApi UserGroupApi) UserGroupUpdateEndpoint(c echo.Context) error {
	id := c.Param("id")

	var item model.UserGroup
	if err := c.Bind(&item); err != nil {
		return err
	}

	if err := service.UserGroupService.Update(id, item.Name, item.Members); err != nil {
		return err
	}

	return Success(c, nil)
}

func (userGroupApi UserGroupApi) UserGroupDeleteEndpoint(c echo.Context) error {
	ids := c.Param("id")
	split := strings.Split(ids, ",")
	for i := range split {
		userId := split[i]
		if err := service.UserGroupService.DeleteById(userId); err != nil {
			return err
		}
	}

	return Success(c, nil)
}

func (userGroupApi UserGroupApi) UserGroupGetEndpoint(c echo.Context) error {
	id := c.Param("id")

	item, err := repository.UserGroupRepository.FindById(context.TODO(), id)
	if err != nil {
		return err
	}

	members, err := repository.UserGroupMemberRepository.FindByUserGroupId(context.TODO(), id)
	if err != nil {
		return err
	}

	userGroup := dto.UserGroup{
		Id:      item.ID,
		Name:    item.Name,
		Created: item.Created,
		Members: members,
	}

	return Success(c, userGroup)
}

func (userGroupApi UserGroupApi) UserGroupAllEndpoint(c echo.Context) error {
	userGroups, err := repository.UserGroupRepository.FindAll(context.Background())
	if err != nil {
		return err
	}
	return Success(c, userGroups)
}
