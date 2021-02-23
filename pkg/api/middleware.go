package api

import (
	"fmt"
	"github.com/labstack/echo/v4"
	"next-terminal/pkg/global"
	"next-terminal/pkg/model"
	"strings"
	"time"
)

func ErrorHandler(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {

		if err := next(c); err != nil {

			if he, ok := err.(*echo.HTTPError); ok {
				message := fmt.Sprintf("%v", he.Message)
				return Fail(c, he.Code, message)
			}

			return Fail(c, 0, err.Error())
		}
		return nil
	}
}

func Auth(next echo.HandlerFunc) echo.HandlerFunc {

	urls := []string{"download", "recording", "login", "static", "favicon", "logo", "asciinema"}

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
		cacheKey := strings.Join([]string{Token, token}, ":")
		authorization, found := global.Cache.Get(cacheKey)
		if !found {
			return Fail(c, 401, "您的登录信息已失效，请重新登录后再试。")
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

func Admin(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {

		account, found := GetCurrentAccount(c)
		if !found {
			return Fail(c, 401, "您的登录信息已失效，请重新登录后再试。")
		}

		if account.Type != model.TypeAdmin {
			return Fail(c, 403, "permission denied")
		}

		return next(c)
	}
}
