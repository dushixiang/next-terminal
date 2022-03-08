package app

import (
	"fmt"
	"net"
	"strings"

	"next-terminal/server/api"
	"next-terminal/server/constant"
	"next-terminal/server/dto"
	"next-terminal/server/global/cache"
	"next-terminal/server/global/security"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
)

func ErrorHandler(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {

		if err := next(c); err != nil {

			if he, ok := err.(*echo.HTTPError); ok {
				message := fmt.Sprintf("%v", he.Message)
				return api.Fail(c, he.Code, message)
			}

			return api.Fail(c, 0, err.Error())
		}
		return nil
	}
}

func TcpWall(next echo.HandlerFunc) echo.HandlerFunc {

	return func(c echo.Context) error {
		securities := security.GlobalSecurityManager.Values()
		if len(securities) == 0 {
			return next(c)
		}

		ip := c.RealIP()

		for _, s := range securities {
			if strings.Contains(s.IP, "/") {
				// CIDR
				_, ipNet, err := net.ParseCIDR(s.IP)
				if err != nil {
					continue
				}
				if !ipNet.Contains(net.ParseIP(ip)) {
					continue
				}
			} else if strings.Contains(s.IP, "-") {
				// 范围段
				split := strings.Split(s.IP, "-")
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
				if s.IP != ip {
					continue
				}
			}

			if s.Rule == constant.AccessRuleAllow {
				return next(c)
			}
			if s.Rule == constant.AccessRuleReject {
				if c.Request().Header.Get("X-Requested-With") != "" || c.Request().Header.Get(constant.Token) != "" {
					return api.Fail(c, 0, "您的访问请求被拒绝 :(")
				} else {
					return c.HTML(666, "您的访问请求被拒绝 :(")
				}
			}
		}

		return next(c)
	}
}

var anonymousUrls = []string{"/login", "/static", "/favicon.ico", "/logo.svg", "/asciinema"}

func Auth(next echo.HandlerFunc) echo.HandlerFunc {

	return func(c echo.Context) error {

		uri := c.Request().RequestURI
		if uri == "/" || strings.HasPrefix(uri, "/#") {
			return next(c)
		}
		// 路由拦截 - 登录身份、资源权限判断等
		for i := range anonymousUrls {
			if strings.HasPrefix(uri, anonymousUrls[i]) {
				return next(c)
			}
		}

		token := api.GetToken(c)
		if token == "" {
			return api.Fail(c, 401, "您的登录信息已失效，请重新登录后再试。")
		}

		v, found := cache.TokenManager.Get(token)
		if !found {
			return api.Fail(c, 401, "您的登录信息已失效，请重新登录后再试。")
		}

		authorization := v.(dto.Authorization)

		if strings.EqualFold(constant.LoginToken, authorization.Type) {
			if authorization.Remember {
				// 记住登录有效期两周
				cache.TokenManager.Set(token, authorization, cache.RememberMeExpiration)
			} else {
				cache.TokenManager.Set(token, authorization, cache.NotRememberExpiration)
			}
		}

		return next(c)
	}
}

func Admin(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {

		account, found := api.GetCurrentAccount(c)
		if !found {
			return api.Fail(c, 401, "您的登录信息已失效，请重新登录后再试。")
		}

		if account.Type != constant.TypeAdmin {
			return api.Fail(c, 403, "permission denied")
		}

		return next(c)
	}
}
