package api

import (
	"strconv"
	"strings"

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
	tokens := strings.Split(ids, ",")
	if err := userService.DeleteLoginLogs(tokens); err != nil {
		return err
	}

	return Success(c, nil)
}

func LoginLogClearEndpoint(c echo.Context) error {
	loginLogs, err := loginLogRepository.FindAllLoginLogs()
	if err != nil {
		return err
	}
	var tokens = make([]string, 0)
	for i := range loginLogs {
		tokens = append(tokens, loginLogs[i].ID)
	}

	if err := userService.DeleteLoginLogs(tokens); err != nil {
		return err
	}
	return Success(c, nil)
}
