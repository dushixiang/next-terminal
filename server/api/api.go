package api

import (
	"next-terminal/server/constant"
	"next-terminal/server/global"
	"next-terminal/server/model"

	"github.com/labstack/echo/v4"
)

type H map[string]interface{}

func Fail(c echo.Context, code int, message string) error {
	return c.JSON(200, H{
		"code":    code,
		"message": message,
	})
}

func FailWithData(c echo.Context, code int, message string, data interface{}) error {
	return c.JSON(200, H{
		"code":    code,
		"message": message,
		"data":    data,
	})
}

func Success(c echo.Context, data interface{}) error {
	return c.JSON(200, H{
		"code":    1,
		"message": "success",
		"data":    data,
	})
}

func NotFound(c echo.Context, message string) error {
	return c.JSON(200, H{
		"code":    -1,
		"message": message,
	})
}

func GetToken(c echo.Context) string {
	token := c.Request().Header.Get(Token)
	if len(token) > 0 {
		return token
	}
	return c.QueryParam(Token)
}

func GetCurrentAccount(c echo.Context) (model.User, bool) {
	token := GetToken(c)
	cacheKey := BuildCacheKeyByToken(token)
	get, b := global.Cache.Get(cacheKey)
	if b {
		return get.(Authorization).User, true
	}
	return model.User{}, false
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
