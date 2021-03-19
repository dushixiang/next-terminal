package api

import (
	"strconv"
	"strings"

	"next-terminal/server/global"

	"github.com/labstack/echo/v4"
	"github.com/sirupsen/logrus"
)

func LoginLogPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	userId := c.QueryParam("userId")
	clientIp := c.QueryParam("clientIp")

	items, total, err := loginLogRepository.Find(pageIndex, pageSize, userId, clientIp)

	if err != nil {
		return err
	}

	return Success(c, H{
		"total": total,
		"items": items,
	})
}

func LoginLogDeleteEndpoint(c echo.Context) error {
	ids := c.Param("id")
	split := strings.Split(ids, ",")
	for i := range split {
		token := split[i]
		global.Cache.Delete(token)
		if err := userService.Logout(token); err != nil {
			logrus.WithError(err).Error("Cache Delete Failed")
		}
	}
	if err := loginLogRepository.DeleteByIdIn(split); err != nil {
		return err
	}

	return Success(c, nil)
}
