package app

import (
	"io/fs"
	"net/http"
	"os"

	"next-terminal/server/api"
	"next-terminal/server/api/worker"
	mw "next-terminal/server/app/middleware"
	"next-terminal/server/config"
	"next-terminal/server/log"
	"next-terminal/server/resource"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func getFS(useOS bool) fs.FS {
	if useOS {
		log.Debug("using live mode")
		return os.DirFS("web/build")
	}

	log.Debug("using embed mode")
	fsys, err := fs.Sub(resource.Resource, "build")
	if err != nil {
		panic(err)
	}

	return fsys
}

func WrapHandler(h http.Handler) echo.HandlerFunc {
	return func(c echo.Context) error {
		c.Response().Header().Set("Cache-Control", `public, max-age=31536000`)
		h.ServeHTTP(c.Response(), c.Request())
		return nil
	}
}

func setupRoutes() *echo.Echo {

	e := echo.New()
	e.HideBanner = true
	//e.Logger = log.GetEchoLogger()
	//e.Use(log.Hook())

	fsys := getFS(config.GlobalCfg.Debug)
	fileServer := http.FileServer(http.FS(fsys))
	handler := WrapHandler(fileServer)
	e.GET("/", handler)
	e.GET("/branding", api.Branding)
	e.GET("/favicon.ico", handler)
	e.GET("/static/*", handler)

	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		Skipper:      middleware.DefaultSkipper,
		AllowOrigins: []string{"*"},
		AllowMethods: []string{http.MethodGet, http.MethodHead, http.MethodPut, http.MethodPatch, http.MethodPost, http.MethodDelete},
	}))
	e.Use(mw.ErrorHandler)
	e.Use(mw.TcpWall)
	e.Use(mw.Auth)
	//e.Use(RBAC)
	e.Use(middleware.Gzip())

	accountApi := new(api.AccountApi)
	guacamoleApi := new(api.GuacamoleApi)
	webTerminalApi := new(api.WebTerminalApi)
	UserApi := new(api.UserApi)
	UserGroupApi := new(api.UserGroupApi)
	AssetApi := new(api.AssetApi)
	CommandApi := new(api.CommandApi)
	CredentialApi := new(api.CredentialApi)
	SessionApi := new(api.SessionApi)
	LoginLogApi := new(api.LoginLogApi)
	PropertyApi := new(api.PropertyApi)
	OverviewApi := new(api.OverviewApi)
	JobApi := new(api.JobApi)
	SecurityApi := new(api.SecurityApi)
	StorageApi := new(api.StorageApi)
	StrategyApi := new(api.StrategyApi)
	AccessGatewayApi := new(api.AccessGatewayApi)
	BackupApi := new(api.BackupApi)
	TenantApi := new(api.TenantApi)
	RoleApi := new(api.RoleApi)
	LoginPolicyApi := new(api.LoginPolicyApi)
	StorageLogApi := new(api.StorageLogApi)
	AuthorisedApi := new(api.AuthorisedApi)

	e.POST("/login", accountApi.LoginEndpoint)

	account := e.Group("/account")
	{
		account.GET("/info", accountApi.InfoEndpoint)
		account.GET("/storage", accountApi.AccountStorageEndpoint)
		account.POST("/logout", accountApi.LogoutEndpoint)
		account.POST("/change-password", accountApi.ChangePasswordEndpoint)
		account.GET("/reload-totp", accountApi.ReloadTOTPEndpoint)
		account.POST("/reset-totp", accountApi.ResetTOTPEndpoint)
		account.POST("/confirm-totp", accountApi.ConfirmTOTPEndpoint)
		account.GET("/access-token", accountApi.AccessTokenGetEndpoint)
		account.POST("/access-token", accountApi.AccessTokenGenEndpoint)
		account.DELETE("/access-token", accountApi.AccessTokenDelEndpoint)
	}

	_worker := e.Group("/worker")
	{
		commands := _worker.Group("/commands")
		{
			workerCommandApi := new(worker.WorkCommandApi)
			commands.GET("", workerCommandApi.CommandAllEndpoint)
			commands.GET("/paging", workerCommandApi.CommandPagingEndpoint)
			commands.POST("", workerCommandApi.CommandCreateEndpoint)
			commands.PUT("/:id", workerCommandApi.CommandUpdateEndpoint)
			commands.DELETE("/:id", workerCommandApi.CommandDeleteEndpoint)
			commands.GET("/:id", workerCommandApi.CommandGetEndpoint)
		}

		assets := _worker.Group("/assets")
		{
			workAssetApi := new(worker.WorkAssetApi)
			assets.GET("/paging", workAssetApi.PagingEndpoint)
			assets.GET("/tags", workAssetApi.TagsEndpoint)
		}
	}

	users := e.Group("/users", mw.Admin)
	{
		users.GET("", UserApi.AllEndpoint)
		users.GET("/paging", UserApi.PagingEndpoint)
		users.POST("", UserApi.CreateEndpoint)
		users.PUT("/:id", UserApi.UpdateEndpoint)
		users.PATCH("/:id/status", UserApi.UpdateStatusEndpoint)
		users.DELETE("/:id", UserApi.DeleteEndpoint)
		users.GET("/:id", UserApi.GetEndpoint)
		users.POST("/:id/change-password", UserApi.ChangePasswordEndpoint)
		users.POST("/:id/reset-totp", UserApi.ResetTotpEndpoint)
	}

	userGroups := e.Group("/user-groups", mw.Admin)
	{
		userGroups.POST("", UserGroupApi.UserGroupCreateEndpoint)
		userGroups.GET("", UserGroupApi.UserGroupAllEndpoint)
		userGroups.GET("/paging", UserGroupApi.UserGroupPagingEndpoint)
		userGroups.PUT("/:id", UserGroupApi.UserGroupUpdateEndpoint)
		userGroups.DELETE("/:id", UserGroupApi.UserGroupDeleteEndpoint)
		userGroups.GET("/:id", UserGroupApi.UserGroupGetEndpoint)
	}

	assets := e.Group("/assets", mw.Admin)
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

	commands := e.Group("/commands", mw.Admin)
	{
		commands.GET("", CommandApi.CommandAllEndpoint)
		commands.GET("/paging", CommandApi.CommandPagingEndpoint)
		commands.POST("", CommandApi.CommandCreateEndpoint)
		commands.PUT("/:id", CommandApi.CommandUpdateEndpoint)
		commands.DELETE("/:id", CommandApi.CommandDeleteEndpoint)
		commands.GET("/:id", CommandApi.CommandGetEndpoint)
		commands.POST("/:id/change-owner", CommandApi.CommandChangeOwnerEndpoint, mw.Admin)
	}

	credentials := e.Group("/credentials", mw.Admin)
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
		sessions.GET("/paging", mw.Admin(SessionApi.SessionPagingEndpoint))
		sessions.POST("/:id/disconnect", mw.Admin(SessionApi.SessionDisconnectEndpoint))
		sessions.DELETE("/:id", mw.Admin(SessionApi.SessionDeleteEndpoint))
		sessions.GET("/:id/recording", mw.Admin(SessionApi.SessionRecordingEndpoint))
		sessions.GET("/:id", mw.Admin(SessionApi.SessionGetEndpoint))
		sessions.POST("/:id/reviewed", mw.Admin(SessionApi.SessionReviewedEndpoint))
		sessions.POST("/:id/unreviewed", mw.Admin(SessionApi.SessionUnViewedEndpoint))
		sessions.POST("/clear", mw.Admin(SessionApi.SessionClearEndpoint))
		sessions.POST("/reviewed", mw.Admin(SessionApi.SessionReviewedAllEndpoint))

		sessions.POST("", SessionApi.SessionCreateEndpoint)
		sessions.POST("/:id/connect", SessionApi.SessionConnectEndpoint)
		sessions.GET("/:id/tunnel", guacamoleApi.Guacamole)
		sessions.GET("/:id/tunnel-monitor", guacamoleApi.GuacamoleMonitor)
		sessions.GET("/:id/ssh", webTerminalApi.SshEndpoint)
		sessions.GET("/:id/ssh-monitor", webTerminalApi.SshMonitorEndpoint)
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

	loginLogs := e.Group("login-logs", mw.Admin)
	{
		loginLogs.GET("/paging", LoginLogApi.LoginLogPagingEndpoint)
		loginLogs.DELETE("/:id", LoginLogApi.LoginLogDeleteEndpoint)
		loginLogs.POST("/clear", LoginLogApi.LoginLogClearEndpoint)
	}

	storageLogs := e.Group("storage-logs", mw.Admin)
	{
		storageLogs.GET("/paging", StorageLogApi.PagingEndpoint)
		storageLogs.DELETE("/:id", StorageLogApi.DeleteEndpoint)
		storageLogs.POST("/clear", StorageLogApi.ClearEndpoint)
	}

	properties := e.Group("properties", mw.Admin)
	{
		properties.GET("", PropertyApi.PropertyGetEndpoint)
		properties.PUT("", PropertyApi.PropertyUpdateEndpoint)
	}

	overview := e.Group("overview", mw.Admin)
	{
		overview.GET("/counter", OverviewApi.OverviewCounterEndPoint)
		overview.GET("/asset", OverviewApi.OverviewAssetEndPoint)
		overview.GET("/date-counter", OverviewApi.OverviewDateCounterEndPoint)
		overview.GET("/ps", OverviewApi.OverviewPS)
	}

	jobs := e.Group("/jobs", mw.Admin)
	{
		jobs.POST("", JobApi.JobCreateEndpoint)
		jobs.GET("/paging", JobApi.JobPagingEndpoint)
		jobs.PUT("/:id", JobApi.JobUpdateEndpoint)
		jobs.POST("/:id/change-status", JobApi.JobChangeStatusEndpoint)
		jobs.POST("/:id/exec", JobApi.JobExecEndpoint)
		jobs.DELETE("/:id", JobApi.JobDeleteEndpoint)
		jobs.GET("/:id", JobApi.JobGetEndpoint)

		jobs.GET("/:id/logs/paging", JobApi.JobGetLogsEndpoint)
		jobs.DELETE("/:id/logs", JobApi.JobDeleteLogsEndpoint)
	}

	securities := e.Group("/securities", mw.Admin)
	{
		securities.POST("", SecurityApi.SecurityCreateEndpoint)
		securities.GET("/paging", SecurityApi.SecurityPagingEndpoint)
		securities.PUT("/:id", SecurityApi.SecurityUpdateEndpoint)
		securities.DELETE("/:id", SecurityApi.SecurityDeleteEndpoint)
		securities.GET("/:id", SecurityApi.SecurityGetEndpoint)
	}

	storages := e.Group("/storages")
	{
		storages.GET("/paging", StorageApi.StoragePagingEndpoint, mw.Admin)
		storages.POST("", StorageApi.StorageCreateEndpoint, mw.Admin)
		storages.DELETE("/:id", StorageApi.StorageDeleteEndpoint, mw.Admin)
		storages.PUT("/:id", StorageApi.StorageUpdateEndpoint, mw.Admin)
		storages.GET("/shares", StorageApi.StorageSharesEndpoint, mw.Admin)
		storages.GET("/:id", StorageApi.StorageGetEndpoint, mw.Admin)

		storages.POST("/:storageId/ls", StorageApi.StorageLsEndpoint)
		storages.GET("/:storageId/download", StorageApi.StorageDownloadEndpoint)
		storages.POST("/:storageId/upload", StorageApi.StorageUploadEndpoint)
		storages.POST("/:storageId/mkdir", StorageApi.StorageMkDirEndpoint)
		storages.POST("/:storageId/rm", StorageApi.StorageRmEndpoint)
		storages.POST("/:storageId/rename", StorageApi.StorageRenameEndpoint)
		storages.POST("/:storageId/edit", StorageApi.StorageEditEndpoint)
	}

	strategies := e.Group("/strategies", mw.Admin)
	{
		strategies.GET("", StrategyApi.StrategyAllEndpoint)
		strategies.GET("/paging", StrategyApi.StrategyPagingEndpoint)
		strategies.POST("", StrategyApi.StrategyCreateEndpoint)
		strategies.DELETE("/:id", StrategyApi.StrategyDeleteEndpoint)
		strategies.PUT("/:id", StrategyApi.StrategyUpdateEndpoint)
		strategies.GET("/:id", StrategyApi.GetEndpoint)
	}

	accessGateways := e.Group("/access-gateways", mw.Admin)
	{
		accessGateways.GET("", AccessGatewayApi.AccessGatewayAllEndpoint)
		accessGateways.POST("", AccessGatewayApi.AccessGatewayCreateEndpoint)
		accessGateways.GET("/paging", AccessGatewayApi.AccessGatewayPagingEndpoint)
		accessGateways.PUT("/:id", AccessGatewayApi.AccessGatewayUpdateEndpoint)
		accessGateways.DELETE("/:id", AccessGatewayApi.AccessGatewayDeleteEndpoint)
		accessGateways.GET("/:id", AccessGatewayApi.AccessGatewayGetEndpoint)
	}

	backup := e.Group("/backup", mw.Admin)
	{
		backup.GET("/export", BackupApi.BackupExportEndpoint)
		backup.POST("/import", BackupApi.BackupImportEndpoint)
	}

	tenants := e.Group("/tenants", mw.Admin)
	{
		tenants.GET("", TenantApi.AllEndpoint)
		tenants.GET("/paging", TenantApi.PagingEndpoint)
		tenants.POST("", TenantApi.CreateEndpoint)
		tenants.DELETE("/:id", TenantApi.DeleteEndpoint)
		tenants.PUT("/:id", TenantApi.UpdateEndpoint)
	}

	roles := e.Group("/roles", mw.Admin)
	{
		roles.GET("", RoleApi.AllEndpoint)
		roles.GET("/paging", RoleApi.PagingEndpoint)
		roles.GET("/:id", RoleApi.GetEndpoint)
		roles.POST("", RoleApi.CreateEndpoint)
		roles.DELETE("/:id", RoleApi.DeleteEndpoint)
		roles.PUT("/:id", RoleApi.UpdateEndpoint)
	}

	loginPolicies := e.Group("/login-policies", mw.Admin)
	{
		loginPolicies.GET("/paging", LoginPolicyApi.PagingEndpoint)
		loginPolicies.GET("/:id", LoginPolicyApi.GetEndpoint)
		loginPolicies.GET("/:id/users/paging", LoginPolicyApi.GetUserPageEndpoint)
		loginPolicies.GET("/:id/users/id", LoginPolicyApi.GetUserIdEndpoint)
		loginPolicies.POST("", LoginPolicyApi.CreateEndpoint)
		loginPolicies.DELETE("/:id", LoginPolicyApi.DeleteEndpoint)
		loginPolicies.PUT("/:id", LoginPolicyApi.UpdateEndpoint)
		loginPolicies.POST("/:id/bind", LoginPolicyApi.BindEndpoint)
		loginPolicies.POST("/:id/unbind", LoginPolicyApi.UnbindEndpoint)
	}

	authorised := e.Group("/authorised", mw.Admin)
	{
		authorised.GET("/assets/paging", AuthorisedApi.PagingAsset)
		authorised.GET("/users/paging", AuthorisedApi.PagingUser)
		authorised.GET("/user-groups/paging", AuthorisedApi.PagingUserGroup)
		authorised.GET("/selected", AuthorisedApi.Selected)
		authorised.POST("/assets", AuthorisedApi.AuthorisedAssets)
		authorised.POST("/users", AuthorisedApi.AuthorisedUsers)
		authorised.POST("/user-groups", AuthorisedApi.AuthorisedUserGroups)
		authorised.DELETE("/:id", AuthorisedApi.Delete)
	}

	e.GET("/menus", RoleApi.TreeMenus, mw.Admin)

	return e
}
