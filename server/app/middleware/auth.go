package middleware

import (
	"next-terminal/server/common/nt"
	"strings"

	"next-terminal/server/api"
	"next-terminal/server/dto"
	"next-terminal/server/global/cache"
	"next-terminal/server/service"

	"github.com/labstack/echo/v4"
	"github.com/ucarion/urlpath"
)

var anonymousUrls = []string{"/login", "/static", "/favicon.ico", "/logo.svg", "/branding"}

var allowUrls = []urlpath.Path{
	urlpath.New("/account/info"),
	urlpath.New("/share-sessions/:id"),
	urlpath.New("/sessions"),
	urlpath.New("/sessions/:id/tunnel"),
	urlpath.New("/sessions/:id/connect"),
	urlpath.New("/sessions/:id/resize"),
	urlpath.New("/sessions/:id/stats"),
	urlpath.New("/sessions/:id/ls"),
	urlpath.New("/sessions/:id/download"),
	urlpath.New("/sessions/:id/upload"),
	urlpath.New("/sessions/:id/edit"),
	urlpath.New("/sessions/:id/mkdir"),
	urlpath.New("/sessions/:id/rm"),
	urlpath.New("/sessions/:id/rename"),
	urlpath.New("/sessions/:id/ssh"),
}

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

		if strings.EqualFold(nt.LoginToken, authorization.Type) {
			if authorization.Remember {
				// 记住登录有效期两周
				cache.TokenManager.Set(token, authorization, cache.RememberMeExpiration)
			} else {
				cache.TokenManager.Set(token, authorization, cache.NotRememberExpiration)
			}
		}

		if strings.HasPrefix(uri, "/account") {
			return next(c)
		}
		if strings.HasPrefix(uri, "/worker") {
			return next(c)
		}

		// 放行接入相关接口
		uri = strings.Split(uri, "?")[0]
		for _, url := range allowUrls {
			_, ok := url.Match(uri)
			if ok {
				return next(c)
			}
		}

		account, _ := api.GetCurrentAccount(c)

		if service.UserService.IsSuperAdmin(account.ID) {
			return next(c)
		}
		var roles []string
		v, ok := cache.UserRolesManager.Get(account.ID)
		if ok {
			roles = v.([]string)
			if len(roles) == 0 {
				roles, _ = service.RoleService.GetRolesByUserId(account.ID)
				cache.UserRolesManager.SetDefault(account.ID, roles)
			}
		} else {
			roles, _ = service.RoleService.GetRolesByUserId(account.ID)
			cache.UserRolesManager.SetDefault(account.ID, roles)
		}

		urlPath := c.Request().URL.Path

		for _, role := range roles {
			menus := service.RoleService.GetMenuListByRole(role)
			for _, menu := range menus {
				permissions := service.MenuService.GetPermissionByMenu(menu)
				for _, perm := range permissions {
					_, ok := perm.Match(urlPath)
					if ok {
						return next(c)
					}
				}
			}
		}
		return api.Fail(c, 403, "permission denied")
	}
}

func Admin(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {

		account, found := api.GetCurrentAccount(c)
		if !found {
			return api.Fail(c, 401, "您的登录信息已失效，请重新登录后再试。")
		}

		if account.Type != nt.TypeAdmin {
			return api.Fail(c, 403, "permission denied.")
		}

		return next(c)
	}
}
