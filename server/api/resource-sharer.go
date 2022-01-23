package api

import (
	"context"

	"next-terminal/server/dto"
	"next-terminal/server/repository"

	"github.com/labstack/echo/v4"
)

type ResourceSharerApi struct{}

func (api ResourceSharerApi) RSGetSharersEndPoint(c echo.Context) error {
	resourceId := c.QueryParam("resourceId")
	resourceType := c.QueryParam("resourceType")
	userId := c.QueryParam("userId")
	userGroupId := c.QueryParam("userGroupId")
	userIds, err := repository.ResourceSharerRepository.Find(context.TODO(), resourceId, resourceType, userId, userGroupId)
	if err != nil {
		return err
	}
	return Success(c, userIds)
}

func (api ResourceSharerApi) ResourceRemoveByUserIdAssignEndPoint(c echo.Context) error {
	var ru dto.RU
	if err := c.Bind(&ru); err != nil {
		return err
	}

	if err := repository.ResourceSharerRepository.DeleteByUserIdAndResourceTypeAndResourceIdIn(context.TODO(), ru.UserGroupId, ru.UserId, ru.ResourceType, ru.ResourceIds); err != nil {
		return err
	}

	return Success(c, "")
}

func (api ResourceSharerApi) ResourceAddByUserIdAssignEndPoint(c echo.Context) error {
	var ru dto.RU
	if err := c.Bind(&ru); err != nil {
		return err
	}

	if err := repository.ResourceSharerRepository.AddSharerResources(ru.UserGroupId, ru.UserId, ru.StrategyId, ru.ResourceType, ru.ResourceIds); err != nil {
		return err
	}

	return Success(c, "")
}
