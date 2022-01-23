package api

import (
	"next-terminal/server/constant"
	"next-terminal/server/dto"
	"next-terminal/server/global/cache"
	"next-terminal/server/model"

	"github.com/labstack/echo/v4"
)

type Map map[string]interface{}

func Fail(c echo.Context, code int, message string) error {
	return c.JSON(200, Map{
		"code":    code,
		"message": message,
	})
}

func FailWithData(c echo.Context, code int, message string, data interface{}) error {
	return c.JSON(200, Map{
		"code":    code,
		"message": message,
		"data":    data,
	})
}

func Success(c echo.Context, data interface{}) error {
	return c.JSON(200, Map{
		"code":    1,
		"message": "success",
		"data":    data,
	})
}

func GetToken(c echo.Context) string {
	token := c.Request().Header.Get(constant.Token)
	if len(token) > 0 {
		return token
	}
	return c.QueryParam(constant.Token)
}

func GetCurrentAccount(c echo.Context) (*model.User, bool) {
	token := GetToken(c)
	get, b := cache.TokenManager.Get(token)
	if b {
		return get.(dto.Authorization).User, true
	}
	return nil, false
}

func HasPermission(c echo.Context, owner string) bool {
	// 检测是否登录
	account, found := GetCurrentAccount(c)
	if !found {
		return false
	}
	// 检测是否为管理人员
	if constant.TypeAdmin == account.Type {
		return true
	}
	// 检测是否为所有者
	if owner == account.ID {
		return true
	}
	return false
}
