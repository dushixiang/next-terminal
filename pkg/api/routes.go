package api

import (
	"net/http"

	"next-terminal/pkg/constant"
	"next-terminal/pkg/global"
	"next-terminal/pkg/log"
	"next-terminal/pkg/model"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

const Token = "X-Auth-Token"

func SetupRoutes() *echo.Echo {

	e := echo.New()
	e.HideBanner = true
	e.Logger = log.GetEchoLogger()

	e.File("/", "web/build/index.html")
	e.File("/asciinema.html", "web/build/asciinema.html")
	e.File("/asciinema-player.js", "web/build/asciinema-player.js")
	e.File("/asciinema-player.css", "web/build/asciinema-player.css")
	e.File("/", "web/build/index.html")
	e.File("/logo.svg", "web/build/logo.svg")
	e.File("/favicon.ico", "web/build/favicon.ico")
	e.Static("/static", "web/build/static")

	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		Skipper:      middleware.DefaultSkipper,
		AllowOrigins: []string{"*"},
		AllowMethods: []string{http.MethodGet, http.MethodHead, http.MethodPut, http.MethodPatch, http.MethodPost, http.MethodDelete},
	}))
	e.Use(ErrorHandler)
	e.Use(TcpWall)
	e.Use(Auth)

	e.POST("/login", LoginEndpoint)
	e.POST("/loginWithTotp", loginWithTotpEndpoint)

	e.GET("/tunnel", TunEndpoint)
	e.GET("/ssh", SSHEndpoint)

	e.POST("/logout", LogoutEndpoint)
	e.POST("/change-password", ChangePasswordEndpoint)
	e.GET("/reload-totp", ReloadTOTPEndpoint)
	e.POST("/reset-totp", ResetTOTPEndpoint)
	e.POST("/confirm-totp", ConfirmTOTPEndpoint)
	e.GET("/info", InfoEndpoint)

	users := e.Group("/users")
	{
		users.POST("", Admin(UserCreateEndpoint))
		users.GET("/paging", UserPagingEndpoint)
		users.PUT("/:id", Admin(UserUpdateEndpoint))
		users.DELETE("/:id", Admin(UserDeleteEndpoint))
		users.GET("/:id", Admin(UserGetEndpoint))
		users.POST("/:id/change-password", Admin(UserChangePasswordEndpoint))
		users.POST("/:id/reset-totp", Admin(UserResetTotpEndpoint))
	}

	userGroups := e.Group("/user-groups", Admin)
	{
		userGroups.POST("", UserGroupCreateEndpoint)
		userGroups.GET("/paging", UserGroupPagingEndpoint)
		userGroups.PUT("/:id", UserGroupUpdateEndpoint)
		userGroups.DELETE("/:id", UserGroupDeleteEndpoint)
		userGroups.GET("/:id", UserGroupGetEndpoint)
		//userGroups.POST("/:id/members", UserGroupAddMembersEndpoint)
		//userGroups.DELETE("/:id/members/:memberId", UserGroupDelMembersEndpoint)
	}

	assets := e.Group("/assets")
	{
		assets.GET("", AssetAllEndpoint)
		assets.POST("", AssetCreateEndpoint)
		assets.POST("/import", Admin(AssetImportEndpoint))
		assets.GET("/paging", AssetPagingEndpoint)
		assets.POST("/:id/tcping", AssetTcpingEndpoint)
		assets.PUT("/:id", AssetUpdateEndpoint)
		assets.DELETE("/:id", AssetDeleteEndpoint)
		assets.GET("/:id", AssetGetEndpoint)
		assets.GET("/:id/attributes", AssetGetAttributeEndpoint)
		assets.POST("/:id/change-owner", Admin(AssetChangeOwnerEndpoint))
	}

	e.GET("/tags", AssetTagsEndpoint)

	commands := e.Group("/commands")
	{
		commands.GET("/paging", CommandPagingEndpoint)
		commands.POST("", CommandCreateEndpoint)
		commands.PUT("/:id", CommandUpdateEndpoint)
		commands.DELETE("/:id", CommandDeleteEndpoint)
		commands.GET("/:id", CommandGetEndpoint)
		commands.POST("/:id/change-owner", Admin(CommandChangeOwnerEndpoint))
	}

	credentials := e.Group("/credentials")
	{
		credentials.GET("", CredentialAllEndpoint)
		credentials.GET("/paging", CredentialPagingEndpoint)
		credentials.POST("", CredentialCreateEndpoint)
		credentials.PUT("/:id", CredentialUpdateEndpoint)
		credentials.DELETE("/:id", CredentialDeleteEndpoint)
		credentials.GET("/:id", CredentialGetEndpoint)
		credentials.POST("/:id/change-owner", Admin(CredentialChangeOwnerEndpoint))
	}

	sessions := e.Group("/sessions")
	{
		sessions.POST("", SessionCreateEndpoint)
		sessions.GET("/paging", Admin(SessionPagingEndpoint))
		sessions.POST("/:id/connect", SessionConnectEndpoint)
		sessions.POST("/:id/disconnect", Admin(SessionDisconnectEndpoint))
		sessions.POST("/:id/resize", SessionResizeEndpoint)
		sessions.GET("/:id/ls", SessionLsEndpoint)
		sessions.GET("/:id/download", SessionDownloadEndpoint)
		sessions.POST("/:id/upload", SessionUploadEndpoint)
		sessions.POST("/:id/mkdir", SessionMkDirEndpoint)
		sessions.POST("/:id/rm", SessionRmEndpoint)
		sessions.POST("/:id/rename", SessionRenameEndpoint)
		sessions.DELETE("/:id", Admin(SessionDeleteEndpoint))
		sessions.GET("/:id/recording", SessionRecordingEndpoint)
	}

	resourceSharers := e.Group("/resource-sharers")
	{
		resourceSharers.GET("/sharers", RSGetSharersEndPoint)
		resourceSharers.POST("/overwrite-sharers", RSOverwriteSharersEndPoint)
		resourceSharers.POST("/remove-resources", Admin(ResourceRemoveByUserIdAssignEndPoint))
		resourceSharers.POST("/add-resources", Admin(ResourceAddByUserIdAssignEndPoint))
	}

	loginLogs := e.Group("login-logs", Admin)
	{
		loginLogs.GET("/paging", LoginLogPagingEndpoint)
		loginLogs.DELETE("/:id", LoginLogDeleteEndpoint)
	}

	e.GET("/properties", Admin(PropertyGetEndpoint))
	e.PUT("/properties", Admin(PropertyUpdateEndpoint))

	e.GET("/overview/counter", OverviewCounterEndPoint)
	e.GET("/overview/sessions", OverviewSessionPoint)

	jobs := e.Group("/jobs", Admin)
	{
		jobs.POST("", JobCreateEndpoint)
		jobs.GET("/paging", JobPagingEndpoint)
		jobs.PUT("/:id", JobUpdateEndpoint)
		jobs.POST("/:id/change-status", JobChangeStatusEndpoint)
		jobs.POST("/:id/exec", JobExecEndpoint)
		jobs.DELETE("/:id", JobDeleteEndpoint)
		jobs.GET("/:id", JobGetEndpoint)
		jobs.GET("/:id/logs", JobGetLogsEndpoint)
		jobs.DELETE("/:id/logs", JobDeleteLogsEndpoint)
	}

	securities := e.Group("/securities", Admin)
	{
		securities.POST("", SecurityCreateEndpoint)
		securities.GET("/paging", SecurityPagingEndpoint)
		securities.PUT("/:id", SecurityUpdateEndpoint)
		securities.DELETE("/:id", SecurityDeleteEndpoint)
		securities.GET("/:id", SecurityGetEndpoint)
	}

	return e
}

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
