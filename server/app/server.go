package app

import (
	"net/http"

	"next-terminal/server/api"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func setupRoutes() *echo.Echo {

	e := echo.New()
	e.HideBanner = true
	//e.Logger = log.GetEchoLogger()
	//e.Use(log.Hook())
	e.File("/", "web/build/index.html")
	e.File("/asciinema.html", "web/build/asciinema.html")
	e.File("/", "web/build/index.html")
	e.File("/favicon.ico", "web/build/favicon.ico")
	e.File("/logo.png", "web/build/logo.png")
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

	accountApi := new(api.AccountApi)
	guacamoleApi := new(api.GuacamoleApi)
	webTerminalApi := new(api.WebTerminalApi)
	UserApi := new(api.UserApi)
	UserGroupApi := new(api.UserGroupApi)
	AssetApi := new(api.AssetApi)
	CommandApi := new(api.CommandApi)
	CredentialApi := new(api.CredentialApi)
	SessionApi := new(api.SessionApi)
	ResourceSharerApi := new(api.ResourceSharerApi)
	LoginLogApi := new(api.LoginLogApi)
	PropertyApi := new(api.PropertyApi)
	OverviewApi := new(api.OverviewApi)
	JobApi := new(api.JobApi)
	SecurityApi := new(api.SecurityApi)
	StorageApi := new(api.StorageApi)
	StrategyApi := new(api.StrategyApi)
	AccessGatewayApi := new(api.AccessGatewayApi)
	BackupApi := new(api.BackupApi)

	e.POST("/login", accountApi.LoginEndpoint)
	e.POST("/loginWithTotp", accountApi.LoginWithTotpEndpoint)

	e.GET("/ssh", webTerminalApi.SshEndpoint)
	e.GET("/ssh-monitor", webTerminalApi.SshMonitorEndpoint)

	account := e.Group("/account")
	{
		account.GET("/info", accountApi.InfoEndpoint)
		account.GET("/assets", accountApi.AccountAssetEndpoint)
		account.GET("/storage", accountApi.AccountStorageEndpoint)
		account.POST("/logout", accountApi.LogoutEndpoint)
		account.POST("/change-password", accountApi.ChangePasswordEndpoint)
		account.GET("/reload-totp", accountApi.ReloadTOTPEndpoint)
		account.POST("/reset-totp", accountApi.ResetTOTPEndpoint)
		account.POST("/confirm-totp", accountApi.ConfirmTOTPEndpoint)
		account.GET("/access-token", accountApi.AccessTokenGetEndpoint)
		account.POST("/access-token", accountApi.AccessTokenGenEndpoint)
	}

	users := e.Group("/users", Admin)
	{
		users.POST("", UserApi.UserCreateEndpoint)
		users.GET("/paging", UserApi.UserPagingEndpoint)
		users.PUT("/:id", UserApi.UserUpdateEndpoint)
		users.PATCH("/:id/status", UserApi.UserUpdateStatusEndpoint)
		users.DELETE("/:id", UserApi.UserDeleteEndpoint)
		users.GET("/:id", UserApi.UserGetEndpoint)
		users.POST("/:id/change-password", UserApi.UserChangePasswordEndpoint)
		users.POST("/:id/reset-totp", UserApi.UserResetTotpEndpoint)
	}

	userGroups := e.Group("/user-groups", Admin)
	{
		userGroups.POST("", UserGroupApi.UserGroupCreateEndpoint)
		userGroups.GET("/paging", UserGroupApi.UserGroupPagingEndpoint)
		userGroups.PUT("/:id", UserGroupApi.UserGroupUpdateEndpoint)
		userGroups.DELETE("/:id", UserGroupApi.UserGroupDeleteEndpoint)
		userGroups.GET("/:id", UserGroupApi.UserGroupGetEndpoint)
	}

	assets := e.Group("/assets", Admin)
	{
		assets.GET("", AssetApi.AssetAllEndpoint)
		assets.POST("", AssetApi.AssetCreateEndpoint)
		assets.POST("/import", AssetApi.AssetImportEndpoint)
		assets.GET("/paging", AssetApi.AssetPagingEndpoint)
		assets.POST("/:id/tcping", AssetApi.AssetTcpingEndpoint)
		assets.PUT("/:id", AssetApi.AssetUpdateEndpoint)
		assets.GET("/:id", AssetApi.AssetGetEndpoint)
		assets.DELETE("/:id", AssetApi.AssetDeleteEndpoint)
		assets.POST("/:id/change-owner", AssetApi.AssetChangeOwnerEndpoint)
	}

	e.GET("/tags", AssetApi.AssetTagsEndpoint)

	commands := e.Group("/commands")
	{
		commands.GET("", CommandApi.CommandAllEndpoint)
		commands.GET("/paging", CommandApi.CommandPagingEndpoint)
		commands.POST("", CommandApi.CommandCreateEndpoint)
		commands.PUT("/:id", CommandApi.CommandUpdateEndpoint)
		commands.DELETE("/:id", CommandApi.CommandDeleteEndpoint)
		commands.GET("/:id", CommandApi.CommandGetEndpoint)
		commands.POST("/:id/change-owner", CommandApi.CommandChangeOwnerEndpoint, Admin)
	}

	credentials := e.Group("/credentials", Admin)
	{
		credentials.GET("", CredentialApi.CredentialAllEndpoint)
		credentials.GET("/paging", CredentialApi.CredentialPagingEndpoint)
		credentials.POST("", CredentialApi.CredentialCreateEndpoint)
		credentials.PUT("/:id", CredentialApi.CredentialUpdateEndpoint)
		credentials.DELETE("/:id", CredentialApi.CredentialDeleteEndpoint)
		credentials.GET("/:id", CredentialApi.CredentialGetEndpoint)
		credentials.POST("/:id/change-owner", CredentialApi.CredentialChangeOwnerEndpoint)
	}

	sessions := e.Group("/sessions")
	{
		sessions.GET("/paging", Admin(SessionApi.SessionPagingEndpoint))
		sessions.POST("/:id/disconnect", Admin(SessionApi.SessionDisconnectEndpoint))
		sessions.DELETE("/:id", Admin(SessionApi.SessionDeleteEndpoint))
		sessions.GET("/:id/recording", Admin(SessionApi.SessionRecordingEndpoint))
		sessions.GET("/:id", Admin(SessionApi.SessionGetEndpoint))
		sessions.POST("/:id/reviewed", Admin(SessionApi.SessionReviewedEndpoint))
		sessions.POST("/:id/unreviewed", Admin(SessionApi.SessionUnViewedEndpoint))
		sessions.POST("/clear", Admin(SessionApi.SessionClearEndpoint))
		sessions.POST("/reviewed", Admin(SessionApi.SessionReviewedAllEndpoint))

		sessions.POST("", SessionApi.SessionCreateEndpoint)
		sessions.POST("/:id/connect", SessionApi.SessionConnectEndpoint)
		sessions.GET("/:id/tunnel", guacamoleApi.Guacamole)
		sessions.POST("/:id/resize", SessionApi.SessionResizeEndpoint)
		sessions.GET("/:id/stats", SessionApi.SessionStatsEndpoint)

		sessions.POST("/:id/ls", SessionApi.SessionLsEndpoint)
		sessions.GET("/:id/download", SessionApi.SessionDownloadEndpoint)
		sessions.POST("/:id/upload", SessionApi.SessionUploadEndpoint)
		sessions.POST("/:id/edit", SessionApi.SessionEditEndpoint)
		sessions.POST("/:id/mkdir", SessionApi.SessionMkDirEndpoint)
		sessions.POST("/:id/rm", SessionApi.SessionRmEndpoint)
		sessions.POST("/:id/rename", SessionApi.SessionRenameEndpoint)
	}

	resourceSharers := e.Group("/resource-sharers", Admin)
	{
		resourceSharers.GET("", ResourceSharerApi.RSGetSharersEndPoint)
		resourceSharers.POST("/remove-resources", ResourceSharerApi.ResourceRemoveByUserIdAssignEndPoint)
		resourceSharers.POST("/add-resources", ResourceSharerApi.ResourceAddByUserIdAssignEndPoint)
	}

	loginLogs := e.Group("login-logs", Admin)
	{
		loginLogs.GET("/paging", LoginLogApi.LoginLogPagingEndpoint)
		loginLogs.DELETE("/:id", LoginLogApi.LoginLogDeleteEndpoint)
		loginLogs.POST("/clear", LoginLogApi.LoginLogClearEndpoint)
	}

	properties := e.Group("properties", Admin)
	{
		properties.GET("", PropertyApi.PropertyGetEndpoint)
		properties.PUT("", PropertyApi.PropertyUpdateEndpoint)
	}

	overview := e.Group("overview", Admin)
	{
		overview.GET("/counter", OverviewApi.OverviewCounterEndPoint)
		overview.GET("/asset", OverviewApi.OverviewAssetEndPoint)
		overview.GET("/access", OverviewApi.OverviewAccessEndPoint)
	}

	jobs := e.Group("/jobs", Admin)
	{
		jobs.POST("", JobApi.JobCreateEndpoint)
		jobs.GET("/paging", JobApi.JobPagingEndpoint)
		jobs.PUT("/:id", JobApi.JobUpdateEndpoint)
		jobs.POST("/:id/change-status", JobApi.JobChangeStatusEndpoint)
		jobs.POST("/:id/exec", JobApi.JobExecEndpoint)
		jobs.DELETE("/:id", JobApi.JobDeleteEndpoint)
		jobs.GET("/:id", JobApi.JobGetEndpoint)
		jobs.GET("/:id/logs", JobApi.JobGetLogsEndpoint)
		jobs.DELETE("/:id/logs", JobApi.JobDeleteLogsEndpoint)
	}

	securities := e.Group("/securities", Admin)
	{
		securities.POST("", SecurityApi.SecurityCreateEndpoint)
		securities.GET("/paging", SecurityApi.SecurityPagingEndpoint)
		securities.PUT("/:id", SecurityApi.SecurityUpdateEndpoint)
		securities.DELETE("/:id", SecurityApi.SecurityDeleteEndpoint)
		securities.GET("/:id", SecurityApi.SecurityGetEndpoint)
	}

	storages := e.Group("/storages")
	{
		storages.GET("/paging", StorageApi.StoragePagingEndpoint, Admin)
		storages.POST("", StorageApi.StorageCreateEndpoint, Admin)
		storages.DELETE("/:id", StorageApi.StorageDeleteEndpoint, Admin)
		storages.PUT("/:id", StorageApi.StorageUpdateEndpoint, Admin)
		storages.GET("/shares", StorageApi.StorageSharesEndpoint, Admin)
		storages.GET("/:id", StorageApi.StorageGetEndpoint, Admin)

		storages.POST("/:storageId/ls", StorageApi.StorageLsEndpoint)
		storages.GET("/:storageId/download", StorageApi.StorageDownloadEndpoint)
		storages.POST("/:storageId/upload", StorageApi.StorageUploadEndpoint)
		storages.POST("/:storageId/mkdir", StorageApi.StorageMkDirEndpoint)
		storages.POST("/:storageId/rm", StorageApi.StorageRmEndpoint)
		storages.POST("/:storageId/rename", StorageApi.StorageRenameEndpoint)
		storages.POST("/:storageId/edit", StorageApi.StorageEditEndpoint)
	}

	strategies := e.Group("/strategies", Admin)
	{
		strategies.GET("", StrategyApi.StrategyAllEndpoint)
		strategies.GET("/paging", StrategyApi.StrategyPagingEndpoint)
		strategies.POST("", StrategyApi.StrategyCreateEndpoint)
		strategies.DELETE("/:id", StrategyApi.StrategyDeleteEndpoint)
		strategies.PUT("/:id", StrategyApi.StrategyUpdateEndpoint)
	}

	accessGateways := e.Group("/access-gateways", Admin)
	{
		accessGateways.GET("", AccessGatewayApi.AccessGatewayAllEndpoint)
		accessGateways.POST("", AccessGatewayApi.AccessGatewayCreateEndpoint)
		accessGateways.GET("/paging", AccessGatewayApi.AccessGatewayPagingEndpoint)
		accessGateways.PUT("/:id", AccessGatewayApi.AccessGatewayUpdateEndpoint)
		accessGateways.DELETE("/:id", AccessGatewayApi.AccessGatewayDeleteEndpoint)
		accessGateways.GET("/:id", AccessGatewayApi.AccessGatewayGetEndpoint)
		accessGateways.POST("/:id/reconnect", AccessGatewayApi.AccessGatewayReconnectEndpoint)
	}

	backup := e.Group("/backup", Admin)
	{
		backup.GET("/export", BackupApi.BackupExportEndpoint)
		backup.POST("/import", BackupApi.BackupImportEndpoint)
	}

	return e
}
