package api

import (
	"fmt"
	"github.com/labstack/echo/v4"
	"next-terminal/pkg/global"
	"next-terminal/pkg/model"
	"regexp"
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

	startWithUrls := []string{"/login", "/static", "/favicon.ico", "/logo.svg", "/asciinema"}

	download := regexp.MustCompile(`^/sessions/\w{8}(-\w{4}){3}-\w{12}/download`)
	recording := regexp.MustCompile(`^/sessions/\w{8}(-\w{4}){3}-\w{12}/recording`)

	return func(c echo.Context) error {

		uri := c.Request().RequestURI
		if uri == "/" || strings.HasPrefix(uri, "/#") {
			return next(c)
		}
		// 路由拦截 - 登录身份、资源权限判断等
		for i := range startWithUrls {
			if strings.HasPrefix(uri, startWithUrls[i]) {
				return next(c)
			}
		}

		if download.FindString(uri) != "" {
			return next(c)
		}

		if recording.FindString(uri) != "" {
			return next(c)
		}

		token := GetToken(c)
		cacheKey := BuildCacheKeyByToken(token)
		authorization, found := global.Cache.Get(cacheKey)
		if !found {
			return Fail(c, 401, "您的登录信息已失效，请重新登录后再试。")
		}

		if authorization.(Authorization).Remember {
			// 记住登录有效期两周
			global.Cache.Set(cacheKey, authorization, time.Hour*time.Duration(24*14))
		} else {
			global.Cache.Set(cacheKey, authorization, time.Hour*time.Duration(2))
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
