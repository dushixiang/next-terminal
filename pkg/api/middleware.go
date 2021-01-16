package api

import (
	"github.com/labstack/echo/v4"
	"github.com/sirupsen/logrus"
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
	permissionUrls := H{
		"/users": "admin",
	}

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
		authorization, found := global.Cache.Get(token)
		if !found {
			logrus.Debugf("您的登录信息已失效，请重新登录后再试。")
			return Fail(c, 401, "您的登录信息已失效，请重新登录后再试。")
		}

		for url := range permissionUrls {
			if strings.HasPrefix(c.Request().RequestURI, url) {
				if authorization.(Authorization).User.Type != permissionUrls[url] {
					return Fail(c, 403, "permission denied")
				}
			}
		}

		if authorization.(Authorization).Remember {
			// 记住登录有效期两周
			global.Cache.Set(token, authorization, time.Hour*time.Duration(24*14))
		} else {
			global.Cache.Set(token, authorization, time.Hour*time.Duration(2))
		}

		return next(c)
	}
}
