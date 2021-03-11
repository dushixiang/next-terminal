package api

import (
	"fmt"
	"github.com/labstack/echo/v4"
	"net"
	"next-terminal/pkg/constant"
	"next-terminal/pkg/global"
	"next-terminal/pkg/utils"
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

func TcpWall(next echo.HandlerFunc) echo.HandlerFunc {

	return func(c echo.Context) error {

		if global.Securities == nil {
			return next(c)
		}

		ip := c.RealIP()
		for i := 0; i < len(global.Securities); i++ {
			security := global.Securities[i]

			if strings.Contains(security.IP, "/") {
				// CIDR
				_, ipNet, err := net.ParseCIDR(security.IP)
				if err != nil {
					continue
				}
				if !ipNet.Contains(net.ParseIP(ip)) {
					continue
				}
			} else if strings.Contains(security.IP, "-") {
				// 范围段
				split := strings.Split(security.IP, "-")
				if len(split) < 2 {
					continue
				}
				start := split[0]
				end := split[1]
				intReqIP := utils.IpToInt(ip)
				if intReqIP < utils.IpToInt(start) || intReqIP > utils.IpToInt(end) {
					continue
				}
			} else {
				// IP
				if security.IP != ip {
					continue
				}
			}

			if security.Rule == constant.AccessRuleAllow {
				return next(c)
			}
			if security.Rule == constant.AccessRuleReject {
				if c.Request().Header.Get("X-Requested-With") != "" || c.Request().Header.Get(Token) != "" {
					return Fail(c, 0, "您的访问请求被拒绝 :(")
				} else {
					return c.HTML(666, "您的访问请求被拒绝 :(")
				}
			}
		}

		return next(c)
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

		if account.Type != constant.TypeAdmin {
			return Fail(c, 403, "permission denied")
		}

		return next(c)
	}
}
