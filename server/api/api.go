package api

import (
	"github.com/labstack/echo/v4"
	"next-terminal/server/common/maps"
	"next-terminal/server/common/nt"
	"next-terminal/server/dto"
	"next-terminal/server/global/cache"
	"next-terminal/server/model"
)

func Fail(c echo.Context, code int, message string) error {
	return c.JSON(200, maps.Map{
		"code":    code,
		"message": message,
	})
}

func FailWithData(c echo.Context, code int, message string, data interface{}) error {
	return c.JSON(200, maps.Map{
		"code":    code,
		"message": message,
		"data":    data,
	})
}

func Success(c echo.Context, data interface{}) error {
	return c.JSON(200, maps.Map{
		"code":    1,
		"message": "success",
		"data":    data,
	})
}

func GetToken(c echo.Context) string {
	token := c.Request().Header.Get(nt.Token)
	if len(token) > 0 {
		return token
	}
	return c.QueryParam(nt.Token)
}

func GetCurrentAccount(c echo.Context) (*model.User, bool) {
	token := GetToken(c)
	get, b := cache.TokenManager.Get(token)
	if b {
		return get.(dto.Authorization).User, true
	}
	return nil, false
}
