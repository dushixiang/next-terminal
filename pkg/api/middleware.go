package api

import (
	"github.com/labstack/echo/v4"
	"next-terminal/pkg/config"
	"strings"
	"time"
)

func Auth(next echo.HandlerFunc) echo.HandlerFunc {

	urls := []string{"download", "login"}

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
		user, found := config.Cache.Get(token)
		if !found {
			c.Logger().Error("您的登录信息已失效，请重新登录后再试。")
			return Fail(c, 403, "您的登录信息已失效，请重新登录后再试。")
		}
		config.Cache.Set(token, user, time.Minute*time.Duration(30))
		return next(c)
	}
}
