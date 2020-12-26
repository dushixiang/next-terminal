package api

import (
	"github.com/labstack/echo/v4"
	"next-terminal/pkg/global"
	"strings"
	"time"
)

func ErrorHandler(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {

		if err := next(c); err != nil {
			return Fail(c, 0, err.Error())
		}
		return nil
	}
}

func Auth(next echo.HandlerFunc) echo.HandlerFunc {

	urls := []string{"download", "recording", "login", "static", "favicon", "logo"}

	return func(c echo.Context) error {
		// 路由拦截 - 登录身份、资源权限判断等
		for i := range urls {
			if c.Request().RequestURI == "/" || strings.HasPrefix(c.Request().RequestURI, "/#") {
				return next(c)
			}
			if strings.Contains(c.Request().RequestURI, urls[i]) {
				return next(c)
			}
		}

		token := GetToken(c)
		user, found := global.Cache.Get(token)
		if !found {
			c.Logger().Error("您的登录信息已失效，请重新登录后再试。")
			return Fail(c, 403, "您的登录信息已失效，请重新登录后再试。")
		}
		global.Cache.Set(token, user, time.Minute*time.Duration(30))
		return next(c)
	}
}
