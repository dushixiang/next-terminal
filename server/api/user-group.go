package api

import (
	"context"
	"strconv"
	"strings"

	"next-terminal/server/dto"
	"next-terminal/server/repository"
	"next-terminal/server/service"

	"github.com/labstack/echo/v4"
)

type UserGroupApi struct{}

func (userGroupApi UserGroupApi) UserGroupCreateEndpoint(c echo.Context) error {
	var item dto.UserGroup
	if err := c.Bind(&item); err != nil {
		return err
	}

	if _, err := service.UserGroupService.Create(item.Name, item.Members); err != nil {
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

	return Success(c, Map{
		"total": total,
		"items": items,
	})
}

func (userGroupApi UserGroupApi) UserGroupUpdateEndpoint(c echo.Context) error {
	id := c.Param("id")

	var item dto.UserGroup
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

	members, err := repository.UserGroupMemberRepository.FindUserIdsByUserGroupId(context.TODO(), id)
	if err != nil {
		return err
	}

	userGroup := dto.UserGroup{
		Id:      item.ID,
		Name:    item.Name,
		Members: members,
	}

	return Success(c, userGroup)
}
