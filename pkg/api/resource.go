package api

import (
	"github.com/labstack/echo/v4"
	"next-terminal/pkg/model"
	"strings"
)

type RU struct {
	UserId       string   `json:"userId"`
	ResourceType string   `json:"resourceType"`
	ResourceIds  []string `json:"resourceIds"`
}

func ResourceGetAssignEndPoint(c echo.Context) error {
	resourceId := c.Param("id")
	userIds, err := model.FindUserIdsByResourceId(resourceId)
	if err != nil {
		return err
	}
	return Success(c, userIds)
}

func ResourceOverwriteAssignEndPoint(c echo.Context) error {
	resourceId := c.Param("id")
	userIds := c.QueryParam("userIds")
	resourceType := c.QueryParam("type")
	uIds := strings.Split(userIds, ",")

	model.OverwriteUserIdsByResourceId(resourceId, resourceType, uIds)

	return Success(c, "")
}

func ResourceRemoveByUserIdAssignEndPoint(c echo.Context) error {
	var ru RU
	if err := c.Bind(&ru); err != nil {
		return err
	}

	if err := model.DeleteByUserIdAndResourceTypeAndResourceIdIn(ru.UserId, ru.ResourceType, ru.ResourceIds); err != nil {
		return err
	}

	return Success(c, "")
}

func ResourceAddByUserIdAssignEndPoint(c echo.Context) error {
	var ru RU
	if err := c.Bind(&ru); err != nil {
		return err
	}

	if err := model.AddSharerResources(ru.UserId, ru.ResourceType, ru.ResourceIds); err != nil {
		return err
	}

	return Success(c, "")
}
