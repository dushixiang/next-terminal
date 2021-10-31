package api

import (
	"github.com/labstack/echo/v4"
)

type RU struct {
	UserGroupId  string   `json:"userGroupId"`
	UserId       string   `json:"userId"`
	StrategyId   string   `json:"strategyId"`
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
	resourceType := c.QueryParam("resourceType")
	userId := c.QueryParam("userId")
	userGroupId := c.QueryParam("userGroupId")
	userIds, err := resourceSharerRepository.Find(resourceId, resourceType, userId, userGroupId)
	if err != nil {
		return err
	}
	return Success(c, userIds)
}

func ResourceRemoveByUserIdAssignEndPoint(c echo.Context) error {
	var ru RU
	if err := c.Bind(&ru); err != nil {
		return err
	}

	if err := resourceSharerRepository.DeleteByUserIdAndResourceTypeAndResourceIdIn(ru.UserGroupId, ru.UserId, ru.ResourceType, ru.ResourceIds); err != nil {
		return err
	}

	return Success(c, "")
}

func ResourceAddByUserIdAssignEndPoint(c echo.Context) error {
	var ru RU
	if err := c.Bind(&ru); err != nil {
		return err
	}

	if err := resourceSharerRepository.AddSharerResources(ru.UserGroupId, ru.UserId, ru.StrategyId, ru.ResourceType, ru.ResourceIds); err != nil {
		return err
	}

	return Success(c, "")
}
