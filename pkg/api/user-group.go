package api

import (
	"github.com/labstack/echo/v4"
	"next-terminal/pkg/global"
	"next-terminal/pkg/model"
	"next-terminal/pkg/utils"
	"strconv"
	"strings"
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

	if err := model.CreateNewUserGroup(&userGroup, item.Members); err != nil {
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

	items, total, err := model.FindPageUserGroup(pageIndex, pageSize, name, order, field)
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

	if err := model.UpdateUserGroupById(&userGroup, item.Members, id); err != nil {
		return err
	}

	return Success(c, nil)
}

func UserGroupDeleteEndpoint(c echo.Context) error {
	ids := c.Param("id")
	split := strings.Split(ids, ",")
	for i := range split {
		userId := split[i]
		model.DeleteUserGroupById(userId)
	}

	return Success(c, nil)
}

func UserGroupGetEndpoint(c echo.Context) error {
	id := c.Param("id")

	item, err := model.FindUserGroupById(id)
	if err != nil {
		return err
	}

	members, err := model.FindUserGroupMembersByUserGroupId(id)
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

func UserGroupAddMembersEndpoint(c echo.Context) error {
	id := c.Param("id")

	var items []string
	if err := c.Bind(&items); err != nil {
		return err
	}

	if err := model.AddUserGroupMembers(global.DB, items, id); err != nil {
		return err
	}
	return Success(c, "")
}

func UserGroupDelMembersEndpoint(c echo.Context) (err error) {
	id := c.Param("id")
	memberIdsStr := c.Param("memberId")
	memberIds := strings.Split(memberIdsStr, ",")
	for i := range memberIds {
		memberId := memberIds[i]
		err = global.DB.Where("user_group_id = ? and user_id = ?", id, memberId).Delete(&model.UserGroupMember{}).Error
		if err != nil {
			return err
		}
	}

	return Success(c, "")
}
