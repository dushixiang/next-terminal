package middleware

import (
	"net"
	"next-terminal/server/common/nt"
	"strings"

	"next-terminal/server/api"
	"next-terminal/server/global/security"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
)

func TcpWall(next echo.HandlerFunc) echo.HandlerFunc {

	return func(c echo.Context) error {
		securities := security.GlobalSecurityManager.Values()
		if len(securities) == 0 {
			return next(c)
		}

		ip := c.RealIP()

		var pass = true

		for _, s := range securities {
			ipGroups := strings.Split(s.IP, ",")
			for _, ipGroup := range ipGroups {
				if strings.Contains(ipGroup, "/") {
					// CIDR
					_, ipNet, err := net.ParseCIDR(ipGroup)
					if err != nil {
						continue
					}
					if !ipNet.Contains(net.ParseIP(ip)) {
						continue
					}
				} else if strings.Contains(ipGroup, "-") {
					// 范围段
					split := strings.Split(ipGroup, "-")
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
					if ipGroup != ip {
						continue
					}
				}

				pass = s.Rule == nt.AccessRuleAllow
			}
		}

		if !pass {
			if c.Request().Header.Get("X-Requested-With") != "" || c.Request().Header.Get(nt.Token) != "" {
				return api.Fail(c, -1, "您的访问请求被拒绝 :(")
			} else {
				return c.HTML(666, "您的访问请求被拒绝 :(")
			}
		}

		return next(c)
	}
}
