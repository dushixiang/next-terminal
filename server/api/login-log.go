package api

import (
	"context"
	"strconv"
	"strings"

	"next-terminal/server/repository"
	"next-terminal/server/service"

	"github.com/labstack/echo/v4"
)

type LoginLogApi struct{}

func (api LoginLogApi) LoginLogPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	username := c.QueryParam("username")
	clientIp := c.QueryParam("clientIp")
	state := c.QueryParam("state")

	items, total, err := repository.LoginLogRepository.Find(context.TODO(), pageIndex, pageSize, username, clientIp, state)

	if err != nil {
		return err
	}

	return Success(c, Map{
		"total": total,
		"items": items,
	})
}

func (api LoginLogApi) LoginLogDeleteEndpoint(c echo.Context) error {
	ids := c.Param("id")
	tokens := strings.Split(ids, ",")
	if err := service.UserService.DeleteLoginLogs(tokens); err != nil {
		return err
	}

	return Success(c, nil)
}

func (api LoginLogApi) LoginLogClearEndpoint(c echo.Context) error {
	loginLogs, err := repository.LoginLogRepository.FindAllLoginLogs(context.TODO())
	if err != nil {
		return err
	}
	var tokens = make([]string, 0)
	for i := range loginLogs {
		tokens = append(tokens, loginLogs[i].ID)
	}

	if err := service.UserService.DeleteLoginLogs(tokens); err != nil {
		return err
	}
	return Success(c, nil)
}
