package api

import (
	"github.com/labstack/echo/v4"
	"next-terminal/pkg/model"
	"strings"
)

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
	uIds := strings.Split(userIds, ",")

	model.OverwriteUserIdsByResourceId(resourceId, uIds)

	return Success(c, "")
}
