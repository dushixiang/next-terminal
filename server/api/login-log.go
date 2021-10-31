package api

import (
	"strconv"
	"strings"

	"next-terminal/server/global/cache"
	"next-terminal/server/log"

	"github.com/labstack/echo/v4"
)

func LoginLogPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	username := c.QueryParam("username")
	clientIp := c.QueryParam("clientIp")
	state := c.QueryParam("state")

	items, total, err := loginLogRepository.Find(pageIndex, pageSize, username, clientIp, state)

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
		cache.GlobalCache.Delete(token)
		if err := userService.Logout(token); err != nil {
			log.WithError(err).Error("Cache Delete Failed")
		}
	}
	if err := loginLogRepository.DeleteByIdIn(split); err != nil {
		return err
	}

	return Success(c, nil)
}

//func LoginLogClearEndpoint(c echo.Context) error {
//	loginLogs, err := loginLogRepository.FindAliveLoginLogs()
//	if err != nil {
//		return err
//	}
//}
