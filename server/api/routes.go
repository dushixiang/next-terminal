package api

import (
	"crypto/md5"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"next-terminal/pkg/global"
	"next-terminal/pkg/log"
	"next-terminal/pkg/service"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/patrickmn/go-cache"
	"gorm.io/driver/mysql"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

const Token = "X-Auth-Token"

var (
	userRepository           *repository.UserRepository
	userGroupRepository      *repository.UserGroupRepository
	resourceSharerRepository *repository.ResourceSharerRepository
	assetRepository          *repository.AssetRepository
	credentialRepository     *repository.CredentialRepository
	propertyRepository       *repository.PropertyRepository
	commandRepository        *repository.CommandRepository
	sessionRepository        *repository.SessionRepository
	numRepository            *repository.NumRepository
	accessSecurityRepository *repository.AccessSecurityRepository
	jobRepository            *repository.JobRepository
	jobLogRepository         *repository.JobLogRepository
	loginLogRepository       *repository.LoginLogRepository

	jobService        *service.JobService
	propertyService   *service.PropertyService
	userService       *service.UserService
	sessionService    *service.SessionService
	mailService       *service.MailService
	numService        *service.NumService
	assetService      *service.AssetService
	credentialService *service.CredentialService
)

func SetupRoutes(db *gorm.DB) *echo.Echo {

	InitRepository(db)
	InitService()

	if err := InitDBData(); err != nil {
		log.WithError(err).Error("初始化数据异常")
		os.Exit(0)
	}

	if err := ReloadData(); err != nil {
		return nil
	}

	e := echo.New()
	e.HideBanner = true
	//e.Logger = log.GetEchoLogger()
	e.Use(log.Hook())
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
	e.GET("/monitor/:id", MonitorEndpoint)
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
	numRepository = repository.NewNumRepository(db)
	accessSecurityRepository = repository.NewAccessSecurityRepository(db)
	jobRepository = repository.NewJobRepository(db)
	jobLogRepository = repository.NewJobLogRepository(db)
	loginLogRepository = repository.NewLoginLogRepository(db)
}

func InitService() {
	jobService = service.NewJobService(jobRepository, jobLogRepository, assetRepository, credentialRepository)
	propertyService = service.NewPropertyService(propertyRepository)
	userService = service.NewUserService(userRepository, loginLogRepository)
	sessionService = service.NewSessionService(sessionRepository)
	mailService = service.NewMailService(propertyRepository)
	numService = service.NewNumService(numRepository)
	assetService = service.NewAssetService(assetRepository)
	credentialService = service.NewCredentialService(credentialRepository)
}

func InitDBData() (err error) {
	if err := propertyService.InitProperties(); err != nil {
		return err
	}
	if err := numService.InitNums(); err != nil {
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

func SetupCache() *cache.Cache {
	// 配置缓存器
	mCache := cache.New(5*time.Minute, 10*time.Minute)
	mCache.OnEvicted(func(key string, value interface{}) {
		if strings.HasPrefix(key, Token) {
			token := GetTokenFormCacheKey(key)
			log.Debugf("用户Token「%v」过期", token)
			err := userService.Logout(token)
			if err != nil {
				log.Errorf("退出登录失败 %v", err)
			}
		}
	})
	return mCache
}

func SetupDB() *gorm.DB {

	var logMode logger.Interface
	if global.Config.Debug {
		logMode = logger.Default.LogMode(logger.Info)
	} else {
		logMode = logger.Default.LogMode(logger.Silent)
	}

	fmt.Printf("当前数据库模式为：%v\n", global.Config.DB)
	var err error
	var db *gorm.DB
	if global.Config.DB == "mysql" {
		dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
			global.Config.Mysql.Username,
			global.Config.Mysql.Password,
			global.Config.Mysql.Hostname,
			global.Config.Mysql.Port,
			global.Config.Mysql.Database,
		)
		db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{
			Logger: logMode,
		})
	} else {
		db, err = gorm.Open(sqlite.Open(global.Config.Sqlite.File), &gorm.Config{
			Logger: logMode,
		})
	}

	if err != nil {
		log.WithError(err).Panic("连接数据库异常")
	}

	if err := db.AutoMigrate(&model.User{}, &model.Asset{}, &model.AssetAttribute{}, &model.Session{}, &model.Command{},
		&model.Credential{}, &model.Property{}, &model.ResourceSharer{}, &model.UserGroup{}, &model.UserGroupMember{},
		&model.LoginLog{}, &model.Num{}, &model.Job{}, &model.JobLog{}, &model.AccessSecurity{}); err != nil {
		log.WithError(err).Panic("初始化数据库表结构异常")
	}
	return db
}
