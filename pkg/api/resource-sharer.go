package api

import (
	"github.com/labstack/echo/v4"
	"next-terminal/pkg/model"
)

type RU struct {
	UserGroupId  string   `json:"userGroupId"`
	UserId       string   `json:"userId"`
	ResourceType string   `json:"resourceType"`
	ResourceIds  []string `json:"resourceIds"`
}

type UR struct {
	ResourceId   string   `json:"resourceId"`
	ResourceType string   `json:"resourceType"`
	UserIds      []string `json:"userIds"`
}

func RSGetSharersEndPoint(c echo.Context) error {
	resourceId := c.QueryParam("resourceId")
	userIds, err := model.FindUserIdsByResourceId(resourceId)
	if err != nil {
		return err
	}
	return Success(c, userIds)
}

func RSOverwriteSharersEndPoint(c echo.Context) error {
	var ur UR
	if err := c.Bind(&ur); err != nil {
		return err
	}

	if err := model.OverwriteUserIdsByResourceId(ur.ResourceId, ur.ResourceType, ur.UserIds); err != nil {
		return err
	}

	return Success(c, "")
}

func ResourceRemoveByUserIdAssignEndPoint(c echo.Context) error {
	var ru RU
	if err := c.Bind(&ru); err != nil {
		return err
	}

	if err := model.DeleteByUserIdAndResourceTypeAndResourceIdIn(ru.UserGroupId, ru.UserId, ru.ResourceType, ru.ResourceIds); err != nil {
		return err
	}

	return Success(c, "")
}

func ResourceAddByUserIdAssignEndPoint(c echo.Context) error {
	var ru RU
	if err := c.Bind(&ru); err != nil {
		return err
	}

	if err := model.AddSharerResources(ru.UserGroupId, ru.UserId, ru.ResourceType, ru.ResourceIds); err != nil {
		return err
	}

	return Success(c, "")
}
