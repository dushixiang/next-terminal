package api

import (
	"crypto/md5"
	"fmt"
	"net/http"
	"os"

	"next-terminal/server/config"
	"next-terminal/server/global/cache"
	"next-terminal/server/log"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/service"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"gorm.io/driver/mysql"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	userRepository           *repository.UserRepository
	userGroupRepository      *repository.UserGroupRepository
	resourceSharerRepository *repository.ResourceSharerRepository
	assetRepository          *repository.AssetRepository
	credentialRepository     *repository.CredentialRepository
	propertyRepository       *repository.PropertyRepository
	commandRepository        *repository.CommandRepository
	sessionRepository        *repository.SessionRepository
	accessSecurityRepository *repository.AccessSecurityRepository
	accessGatewayRepository  *repository.AccessGatewayRepository
	jobRepository            *repository.JobRepository
	jobLogRepository         *repository.JobLogRepository
	loginLogRepository       *repository.LoginLogRepository
	storageRepository        *repository.StorageRepository
	strategyRepository       *repository.StrategyRepository

	jobService           *service.JobService
	propertyService      *service.PropertyService
	userService          *service.UserService
	sessionService       *service.SessionService
	mailService          *service.MailService
	assetService         *service.AssetService
	credentialService    *service.CredentialService
	storageService       *service.StorageService
	accessGatewayService *service.AccessGatewayService
)

func SetupRoutes(db *gorm.DB) *echo.Echo {

	InitRepository(db)
	InitService()

	cache.GlobalCache.OnEvicted(userService.OnEvicted)

	if err := InitDBData(); err != nil {
		log.Errorf("初始化数据异常: %v", err.Error())
		os.Exit(0)
	}

	if err := ReloadData(); err != nil {
		return nil
	}

	e := echo.New()
	e.HideBanner = true
	//e.Logger = log.GetEchoLogger()
	//e.Use(log.Hook())
	e.File("/", "web/build/index.html")
	e.File("/asciinema.html", "web/build/asciinema.html")
	e.File("/", "web/build/index.html")
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
	e.GET("/ssh-monitor", SshMonitor)
	e.POST("/logout", LogoutEndpoint)
	e.POST("/change-password", ChangePasswordEndpoint)
	e.GET("/reload-totp", ReloadTOTPEndpoint)
	e.POST("/reset-totp", ResetTOTPEndpoint)
	e.POST("/confirm-totp", ConfirmTOTPEndpoint)
	e.GET("/info", InfoEndpoint)

	account := e.Group("/account")
	{
		account.GET("/assets", AccountAssetEndpoint)
		account.GET("/storage", AccountStorageEndpoint)
	}

	users := e.Group("/users", Admin)
	{
		users.POST("", UserCreateEndpoint)
		users.GET("/paging", UserPagingEndpoint)
		users.PUT("/:id", UserUpdateEndpoint)
		users.DELETE("/:id", UserDeleteEndpoint)
		users.GET("/:id", UserGetEndpoint)
		users.POST("/:id/change-password", UserChangePasswordEndpoint)
		users.POST("/:id/reset-totp", UserResetTotpEndpoint)
	}

	userGroups := e.Group("/user-groups", Admin)
	{
		userGroups.POST("", UserGroupCreateEndpoint)
		userGroups.GET("/paging", UserGroupPagingEndpoint)
		userGroups.PUT("/:id", UserGroupUpdateEndpoint)
		userGroups.DELETE("/:id", UserGroupDeleteEndpoint)
		userGroups.GET("/:id", UserGroupGetEndpoint)
	}

	assets := e.Group("/assets", Admin)
	{
		assets.GET("", AssetAllEndpoint)
		assets.POST("", AssetCreateEndpoint)
		assets.POST("/import", AssetImportEndpoint)
		assets.GET("/paging", AssetPagingEndpoint)
		assets.POST("/:id/tcping", AssetTcpingEndpoint)
		assets.PUT("/:id", AssetUpdateEndpoint)
		assets.GET("/:id", AssetGetEndpoint)
		assets.DELETE("/:id", AssetDeleteEndpoint)
		assets.POST("/:id/change-owner", AssetChangeOwnerEndpoint)
	}

	e.GET("/tags", AssetTagsEndpoint)

	commands := e.Group("/commands")
	{
		commands.GET("", CommandAllEndpoint)
		commands.GET("/paging", CommandPagingEndpoint)
		commands.POST("", CommandCreateEndpoint)
		commands.PUT("/:id", CommandUpdateEndpoint)
		commands.DELETE("/:id", CommandDeleteEndpoint)
		commands.GET("/:id", CommandGetEndpoint)
		commands.POST("/:id/change-owner", CommandChangeOwnerEndpoint, Admin)
	}

	credentials := e.Group("/credentials", Admin)
	{
		credentials.GET("", CredentialAllEndpoint)
		credentials.GET("/paging", CredentialPagingEndpoint)
		credentials.POST("", CredentialCreateEndpoint)
		credentials.PUT("/:id", CredentialUpdateEndpoint)
		credentials.DELETE("/:id", CredentialDeleteEndpoint)
		credentials.GET("/:id", CredentialGetEndpoint)
		credentials.POST("/:id/change-owner", CredentialChangeOwnerEndpoint)
	}

	sessions := e.Group("/sessions")
	{
		sessions.GET("/paging", Admin(SessionPagingEndpoint))
		sessions.POST("/:id/disconnect", Admin(SessionDisconnectEndpoint))
		sessions.DELETE("/:id", Admin(SessionDeleteEndpoint))
		sessions.GET("/:id/recording", Admin(SessionRecordingEndpoint))
		sessions.GET("/:id", Admin(SessionGetEndpoint))

		sessions.POST("", SessionCreateEndpoint)
		sessions.POST("/:id/connect", SessionConnectEndpoint)
		sessions.POST("/:id/resize", SessionResizeEndpoint)
		sessions.GET("/:id/stats", SessionStatsEndpoint)

		sessions.POST("/:id/ls", SessionLsEndpoint)
		sessions.GET("/:id/download", SessionDownloadEndpoint)
		sessions.POST("/:id/upload", SessionUploadEndpoint)
		sessions.POST("/:id/edit", SessionEditEndpoint)
		sessions.POST("/:id/mkdir", SessionMkDirEndpoint)
		sessions.POST("/:id/rm", SessionRmEndpoint)
		sessions.POST("/:id/rename", SessionRenameEndpoint)
	}

	resourceSharers := e.Group("/resource-sharers", Admin)
	{
		resourceSharers.GET("", RSGetSharersEndPoint)
		resourceSharers.POST("/remove-resources", ResourceRemoveByUserIdAssignEndPoint)
		resourceSharers.POST("/add-resources", ResourceAddByUserIdAssignEndPoint)
	}

	loginLogs := e.Group("login-logs", Admin)
	{
		loginLogs.GET("/paging", LoginLogPagingEndpoint)
		loginLogs.DELETE("/:id", LoginLogDeleteEndpoint)
		//loginLogs.DELETE("/clear", LoginLogClearEndpoint)
	}

	e.GET("/properties", Admin(PropertyGetEndpoint))
	e.PUT("/properties", Admin(PropertyUpdateEndpoint))

	overview := e.Group("overview", Admin)
	{
		overview.GET("/counter", OverviewCounterEndPoint)
		overview.GET("/asset", OverviewAssetEndPoint)
		overview.GET("/access", OverviewAccessEndPoint)
	}

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

	storages := e.Group("/storages")
	{
		storages.GET("/paging", StoragePagingEndpoint, Admin)
		storages.POST("", StorageCreateEndpoint, Admin)
		storages.DELETE("/:id", StorageDeleteEndpoint, Admin)
		storages.PUT("/:id", StorageUpdateEndpoint, Admin)
		storages.GET("/shares", StorageSharesEndpoint, Admin)
		storages.GET("/:id", StorageGetEndpoint, Admin)

		storages.POST("/:storageId/ls", StorageLsEndpoint)
		storages.GET("/:storageId/download", StorageDownloadEndpoint)
		storages.POST("/:storageId/upload", StorageUploadEndpoint)
		storages.POST("/:storageId/mkdir", StorageMkDirEndpoint)
		storages.POST("/:storageId/rm", StorageRmEndpoint)
		storages.POST("/:storageId/rename", StorageRenameEndpoint)
		storages.POST("/:storageId/edit", StorageEditEndpoint)
	}

	strategies := e.Group("/strategies", Admin)
	{
		strategies.GET("", StrategyAllEndpoint)
		strategies.GET("/paging", StrategyPagingEndpoint)
		strategies.POST("", StrategyCreateEndpoint)
		strategies.DELETE("/:id", StrategyDeleteEndpoint)
		strategies.PUT("/:id", StrategyUpdateEndpoint)
	}

	accessGateways := e.Group("/access-gateways", Admin)
	{
		accessGateways.GET("", AccessGatewayAllEndpoint)
		accessGateways.POST("", AccessGatewayCreateEndpoint)
		accessGateways.GET("/paging", AccessGatewayPagingEndpoint)
		accessGateways.PUT("/:id", AccessGatewayUpdateEndpoint)
		accessGateways.DELETE("/:id", AccessGatewayDeleteEndpoint)
		accessGateways.GET("/:id", AccessGatewayGetEndpoint)
		accessGateways.POST("/:id/reconnect", AccessGatewayReconnectEndpoint)
	}

	return e
}

func ReloadData() error {
	if err := ReloadAccessSecurity(); err != nil {
		return err
	}

	if err := ReloadToken(); err != nil {
		return err
	}
	return nil
}

func InitRepository(db *gorm.DB) {
	userRepository = repository.NewUserRepository(db)
	userGroupRepository = repository.NewUserGroupRepository(db)
	resourceSharerRepository = repository.NewResourceSharerRepository(db)
	assetRepository = repository.NewAssetRepository(db)
	credentialRepository = repository.NewCredentialRepository(db)
	propertyRepository = repository.NewPropertyRepository(db)
	commandRepository = repository.NewCommandRepository(db)
	sessionRepository = repository.NewSessionRepository(db)
	accessSecurityRepository = repository.NewAccessSecurityRepository(db)
	accessGatewayRepository = repository.NewAccessGatewayRepository(db)
	jobRepository = repository.NewJobRepository(db)
	jobLogRepository = repository.NewJobLogRepository(db)
	loginLogRepository = repository.NewLoginLogRepository(db)
	storageRepository = repository.NewStorageRepository(db)
	strategyRepository = repository.NewStrategyRepository(db)
}

func InitService() {
	propertyService = service.NewPropertyService(propertyRepository)
	userService = service.NewUserService(userRepository, loginLogRepository)
	sessionService = service.NewSessionService(sessionRepository)
	mailService = service.NewMailService(propertyRepository)
	assetService = service.NewAssetService(assetRepository)
	jobService = service.NewJobService(jobRepository, jobLogRepository, assetRepository, credentialRepository, assetService)
	credentialService = service.NewCredentialService(credentialRepository)
	storageService = service.NewStorageService(storageRepository, userRepository, propertyRepository)
	accessGatewayService = service.NewAccessGatewayService(accessGatewayRepository)
}

func InitDBData() (err error) {
	if err := propertyService.DeleteDeprecatedProperty(); err != nil {
		return err
	}
	if err := propertyService.InitProperties(); err != nil {
		return err
	}
	if err := userService.InitUser(); err != nil {
		return err
	}
	if err := jobService.InitJob(); err != nil {
		return err
	}
	if err := userService.FixUserOnlineState(); err != nil {
		return err
	}
	if err := sessionService.FixSessionState(); err != nil {
		return err
	}
	if err := sessionService.EmptyPassword(); err != nil {
		return err
	}
	if err := credentialService.Encrypt(); err != nil {
		return err
	}
	if err := assetService.Encrypt(); err != nil {
		return err
	}
	if err := storageService.InitStorages(); err != nil {
		return err
	}
	if err := accessGatewayService.ReConnectAll(); err != nil {
		return err
	}
	return nil
}

func ResetPassword(username string) error {
	user, err := userRepository.FindByUsername(username)
	if err != nil {
		return err
	}
	password := "next-terminal"
	passwd, err := utils.Encoder.Encode([]byte(password))
	if err != nil {
		return err
	}
	u := &model.User{
		Password: string(passwd),
		ID:       user.ID,
	}
	if err := userRepository.Update(u); err != nil {
		return err
	}
	log.Debugf("用户「%v」密码初始化为: %v", user.Username, password)
	return nil
}

func ResetTotp(username string) error {
	user, err := userRepository.FindByUsername(username)
	if err != nil {
		return err
	}
	u := &model.User{
		TOTPSecret: "-",
		ID:         user.ID,
	}
	if err := userRepository.Update(u); err != nil {
		return err
	}
	log.Debugf("用户「%v」已重置TOTP", user.Username)
	return nil
}

func ChangeEncryptionKey(oldEncryptionKey, newEncryptionKey string) error {

	oldPassword := []byte(fmt.Sprintf("%x", md5.Sum([]byte(oldEncryptionKey))))
	newPassword := []byte(fmt.Sprintf("%x", md5.Sum([]byte(newEncryptionKey))))

	credentials, err := credentialRepository.FindAll()
	if err != nil {
		return err
	}
	for i := range credentials {
		credential := credentials[i]
		if err := credentialRepository.Decrypt(&credential, oldPassword); err != nil {
			return err
		}
		if err := credentialRepository.Encrypt(&credential, newPassword); err != nil {
			return err
		}
		if err := credentialRepository.UpdateById(&credential, credential.ID); err != nil {
			return err
		}
	}
	assets, err := assetRepository.FindAll()
	if err != nil {
		return err
	}
	for i := range assets {
		asset := assets[i]
		if err := assetRepository.Decrypt(&asset, oldPassword); err != nil {
			return err
		}
		if err := assetRepository.Encrypt(&asset, newPassword); err != nil {
			return err
		}
		if err := assetRepository.UpdateById(&asset, asset.ID); err != nil {
			return err
		}
	}
	log.Infof("encryption key has being changed.")
	return nil
}

func SetupDB() *gorm.DB {

	var logMode logger.Interface
	if config.GlobalCfg.Debug {
		logMode = logger.Default.LogMode(logger.Info)
	} else {
		logMode = logger.Default.LogMode(logger.Silent)
	}

	fmt.Printf("当前数据库模式为：%v\n", config.GlobalCfg.DB)
	var err error
	var db *gorm.DB
	if config.GlobalCfg.DB == "mysql" {
		dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local&timeout=60s",
			config.GlobalCfg.Mysql.Username,
			config.GlobalCfg.Mysql.Password,
			config.GlobalCfg.Mysql.Hostname,
			config.GlobalCfg.Mysql.Port,
			config.GlobalCfg.Mysql.Database,
		)
		db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{
			Logger: logMode,
		})
	} else {
		db, err = gorm.Open(sqlite.Open(config.GlobalCfg.Sqlite.File), &gorm.Config{
			Logger: logMode,
		})
	}

	if err != nil {
		log.Errorf("连接数据库异常: %v", err.Error())
		os.Exit(0)
	}

	if err := db.AutoMigrate(&model.User{}, &model.Asset{}, &model.AssetAttribute{}, &model.Session{}, &model.Command{},
		&model.Credential{}, &model.Property{}, &model.ResourceSharer{}, &model.UserGroup{}, &model.UserGroupMember{},
		&model.LoginLog{}, &model.Job{}, &model.JobLog{}, &model.AccessSecurity{}, &model.AccessGateway{},
		&model.Storage{}, &model.Strategy{}); err != nil {
		log.Errorf("初始化数据库表结构异常: %v", err.Error())
		os.Exit(0)
	}
	return db
}
