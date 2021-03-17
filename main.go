package main

import (
	"bytes"
	"fmt"
	"io"
	"next-terminal/server/repository"
	"os"
	"strconv"
	"strings"
	"time"

	"next-terminal/server/api"
	"next-terminal/server/config"
	"next-terminal/server/constant"
	"next-terminal/server/global"
	"next-terminal/server/handle"
	"next-terminal/server/model"
	"next-terminal/server/utils"

	nested "github.com/antonfisher/nested-logrus-formatter"
	"github.com/labstack/gommon/log"
	"github.com/patrickmn/go-cache"
	"github.com/robfig/cron/v3"
	"github.com/sirupsen/logrus"
	"gorm.io/driver/mysql"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

const Version = "v0.3.3"

var (
	db             *gorm.DB
	userRepository repository.UserRepository
)

func main() {
	err := Run()
	if err != nil {
		log.Fatal(err)
	}
}

func Run() error {

	fmt.Printf(`
 _______                   __    ___________                  .__              .__   
 \      \   ____ ___  ____/  |_  \__    ___/__________  _____ |__| ____ _____  |  |  
 /   |   \_/ __ \\  \/  /\   __\   |    |_/ __ \_  __ \/     \|  |/    \\__  \ |  |  
/    |    \  ___/ >    <  |  |     |    |\  ___/|  | \/  Y Y  \  |   |  \/ __ \|  |__
\____|__  /\___  >__/\_ \ |__|     |____| \___  >__|  |__|_|  /__|___|  (____  /____/
        \/     \/      \/                     \/            \/        \/     \/      ` + Version + "\n\n")

	var err error
	//logrus.SetReportCaller(true)
	logrus.SetLevel(logrus.DebugLevel)
	logrus.SetFormatter(&nested.Formatter{
		HideKeys:    true,
		FieldsOrder: []string{"component", "category"},
	})

	writer1 := &bytes.Buffer{}
	writer2 := os.Stdout
	writer3, err := os.OpenFile("next-terminal.log", os.O_WRONLY|os.O_CREATE, 0755)
	if err != nil {
		log.Fatalf("create file log.txt failed: %v", err)
	}

	logrus.SetOutput(io.MultiWriter(writer1, writer2, writer3))

	global.Config = config.SetupConfig()
	db = SetupDB()

	// 初始化 repository
	global.DB = db
	userRepository = repository.UserRepository{DB: db}

	if global.Config.ResetPassword != "" {
		return ResetPassword()
	}

	if err := global.DB.AutoMigrate(&model.User{}, &model.Asset{}, &model.AssetAttribute{}, &model.Session{}, &model.Command{},
		&model.Credential{}, &model.Property{}, &model.ResourceSharer{}, &model.UserGroup{}, &model.UserGroupMember{},
		&model.LoginLog{}, &model.Num{}, &model.Job{}, &model.JobLog{}, &model.AccessSecurity{}); err != nil {
		return err
	}

	if err := InitDBData(); err != nil {
		return err
	}

	if err := api.ReloadAccessSecurity(); err != nil {
		return err
	}

	// 配置缓存器
	global.Cache = cache.New(5*time.Minute, 10*time.Minute)
	global.Cache.OnEvicted(func(key string, value interface{}) {
		if strings.HasPrefix(key, api.Token) {
			token := api.GetTokenFormCacheKey(key)
			logrus.Debugf("用户Token「%v」过期", token)
			err := model.Logout(token)
			if err != nil {
				logrus.Errorf("退出登录失败 %v", err)
			}
		}
	})
	global.Store = global.NewStore()
	global.Cron = cron.New(cron.WithSeconds()) //精确到秒
	global.Cron.Start()

	e := api.SetupRoutes(userRepository)
	if err := handle.InitProperties(); err != nil {
		return err
	}
	// 启动定时任务
	go handle.RunTicker()
	go handle.RunDataFix()

	if global.Config.Server.Cert != "" && global.Config.Server.Key != "" {
		return e.StartTLS(global.Config.Server.Addr, global.Config.Server.Cert, global.Config.Server.Key)
	} else {
		return e.Start(global.Config.Server.Addr)
	}

}

func InitDBData() (err error) {
	users := userRepository.FindAll()

	if len(users) == 0 {
		initPassword := "admin"
		var pass []byte
		if pass, err = utils.Encoder.Encode([]byte(initPassword)); err != nil {
			return err
		}

		user := model.User{
			ID:       utils.UUID(),
			Username: "admin",
			Password: string(pass),
			Nickname: "超级管理员",
			Type:     constant.TypeAdmin,
			Created:  utils.NowJsonTime(),
		}
		if err := userRepository.Create(&user); err != nil {
			return err
		}
		logrus.Infof("初始用户创建成功，账号：「%v」密码：「%v」", user.Username, initPassword)
	} else {
		for i := range users {
			// 修正默认用户类型为管理员
			if users[i].Type == "" {
				user := model.User{
					Type: constant.TypeAdmin,
					ID:   users[i].ID,
				}
				if err := userRepository.Update(&user); err != nil {
					return err
				}
				logrus.Infof("自动修正用户「%v」ID「%v」类型为管理员", users[i].Nickname, users[i].ID)
			}
		}
	}

	if len(model.FindAllTemp()) == 0 {
		for i := 0; i <= 30; i++ {
			if err := model.CreateNewTemp(&model.Num{I: strconv.Itoa(i)}); err != nil {
				return err
			}
		}
	}

	jobs, err := model.FindJobByFunc(constant.FuncCheckAssetStatusJob)
	if err != nil {
		return err
	}
	if len(jobs) == 0 {
		job := model.Job{
			ID:      utils.UUID(),
			Name:    "资产状态检测",
			Func:    constant.FuncCheckAssetStatusJob,
			Cron:    "0 0 0/1 * * ?",
			Mode:    constant.JobModeAll,
			Status:  constant.JobStatusRunning,
			Created: utils.NowJsonTime(),
			Updated: utils.NowJsonTime(),
		}
		if err := model.CreateNewJob(&job); err != nil {
			return err
		}
		logrus.Debugf("创建计划任务「%v」cron「%v」", job.Name, job.Cron)
	} else {
		for i := range jobs {
			if jobs[i].Status == constant.JobStatusRunning {
				err := model.ChangeJobStatusById(jobs[i].ID, constant.JobStatusRunning)
				if err != nil {
					return err
				}
				logrus.Debugf("启动计划任务「%v」cron「%v」", jobs[i].Name, jobs[i].Cron)
			}
		}
	}

	loginLogs, err := model.FindAliveLoginLogs()
	if err != nil {
		return err
	}

	for i := range loginLogs {
		loginLog := loginLogs[i]
		token := loginLog.ID
		user, err := userRepository.FindById(loginLog.UserId)
		if err != nil {
			logrus.Debugf("用户「%v」获取失败，忽略", loginLog.UserId)
			continue
		}

		authorization := api.Authorization{
			Token:    token,
			Remember: loginLog.Remember,
			User:     user,
		}

		cacheKey := api.BuildCacheKeyByToken(token)

		if authorization.Remember {
			// 记住登录有效期两周
			global.Cache.Set(cacheKey, authorization, api.RememberEffectiveTime)
		} else {
			global.Cache.Set(cacheKey, authorization, api.NotRememberEffectiveTime)
		}
		logrus.Debugf("重新加载用户「%v」授权Token「%v」到缓存", user.Nickname, token)
	}

	// 修正用户登录状态
	onlineUsers, err := userRepository.FindOnlineUsers()
	if err != nil {
		return err
	}
	for i := range onlineUsers {
		logs, err := model.FindAliveLoginLogsByUserId(onlineUsers[i].ID)
		if err != nil {
			return err
		}
		if len(logs) == 0 {
			if err := userRepository.UpdateOnline(onlineUsers[i].ID, false); err != nil {
				return err
			}
		}
	}

	return nil
}

func ResetPassword() error {
	user, err := userRepository.FindByUsername(global.Config.ResetPassword)
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
	logrus.Debugf("用户「%v」密码初始化为: %v", user.Username, password)
	return nil
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
		logrus.WithError(err).Panic("连接数据库异常")
	}
	return db
}
