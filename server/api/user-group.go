package api

import (
	"strconv"
	"strings"

	"next-terminal/server/model"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
)

type UserGroup struct {
	Id      string   `json:"id"`
	Name    string   `json:"name"`
	Members []string `json:"members"`
}

func UserGroupCreateEndpoint(c echo.Context) error {
	var item UserGroup
	if err := c.Bind(&item); err != nil {
		return err
	}

	userGroup := model.UserGroup{
		ID:      utils.UUID(),
		Created: utils.NowJsonTime(),
		Name:    item.Name,
	}

	if err := userGroupRepository.Create(&userGroup, item.Members); err != nil {
		return err
	}

	return Success(c, item)
}

func UserGroupPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	name := c.QueryParam("name")

	order := c.QueryParam("order")
	field := c.QueryParam("field")

	items, total, err := userGroupRepository.Find(pageIndex, pageSize, name, order, field)
	if err != nil {
		return err
	}

	return Success(c, H{
		"total": total,
		"items": items,
	})
}

func UserGroupUpdateEndpoint(c echo.Context) error {
	id := c.Param("id")

	var item UserGroup
	if err := c.Bind(&item); err != nil {
		return err
	}
	userGroup := model.UserGroup{
		Name: item.Name,
	}

	if err := userGroupRepository.Update(&userGroup, item.Members, id); err != nil {
		return err
	}

	return Success(c, nil)
}

func UserGroupDeleteEndpoint(c echo.Context) error {
	ids := c.Param("id")
	split := strings.Split(ids, ",")
	for i := range split {
		userId := split[i]
		if err := userGroupRepository.DeleteById(userId); err != nil {
			return err
		}
	}

	return Success(c, nil)
}

func UserGroupGetEndpoint(c echo.Context) error {
	id := c.Param("id")

	item, err := userGroupRepository.FindById(id)
	if err != nil {
		return err
	}

	members, err := userGroupRepository.FindMembersById(id)
	if err != nil {
		return err
	}

	userGroup := UserGroup{
		Id:      item.ID,
		Name:    item.Name,
		Members: members,
	}

	return Success(c, userGroup)
}
