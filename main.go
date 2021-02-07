package main

import (
	"bytes"
	"fmt"
	nested "github.com/antonfisher/nested-logrus-formatter"
	"github.com/labstack/gommon/log"
	"github.com/patrickmn/go-cache"
	"github.com/sirupsen/logrus"
	"gorm.io/driver/mysql"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"io"
	"next-terminal/pkg/api"
	"next-terminal/pkg/config"
	"next-terminal/pkg/global"
	"next-terminal/pkg/handle"
	"next-terminal/pkg/model"
	"next-terminal/pkg/utils"
	"os"
	"strconv"
	"time"
)

const Version = "v0.1.2"

func main() {
	log.Fatal(Run())
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

	global.Config, err = config.SetupConfig()
	if err != nil {
		return err
	}

	fmt.Printf("当前数据库模式为：%v\n", global.Config.DB)
	if global.Config.DB == "mysql" {
		dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
			global.Config.Mysql.Username,
			global.Config.Mysql.Password,
			global.Config.Mysql.Hostname,
			global.Config.Mysql.Port,
			global.Config.Mysql.Database,
		)
		global.DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{
			//Logger: logger.Default.LogMode(logger.Info),
		})
	} else {
		global.DB, err = gorm.Open(sqlite.Open(global.Config.Sqlite.File), &gorm.Config{})
	}

	if err != nil {
		logrus.Errorf("连接数据库异常：%v", err.Error())
		return err
	}

	if err := global.DB.AutoMigrate(&model.User{}); err != nil {
		return err
	}

	users := model.FindAllUser()
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
			Type:     model.TypeAdmin,
			Created:  utils.NowJsonTime(),
		}
		if err := model.CreateNewUser(&user); err != nil {
			return err
		}
		logrus.Infof("初始用户创建成功，账号：「%v」密码：「%v」", user.Username, initPassword)
	} else {
		for i := range users {
			// 修正默认用户类型为管理员
			if users[i].Type == "" {
				user := model.User{
					Type: model.TypeAdmin,
				}
				model.UpdateUserById(&user, users[i].ID)
				logrus.Infof("自动修正用户「%v」ID「%v」类型为管理员", users[i].Nickname, users[i].ID)
			}
		}
	}

	if err := global.DB.AutoMigrate(&model.Asset{}); err != nil {
		return err
	}
	if err := global.DB.AutoMigrate(&model.Session{}); err != nil {
		return err
	}
	if err := global.DB.AutoMigrate(&model.Command{}); err != nil {
		return err
	}
	if err := global.DB.AutoMigrate(&model.Credential{}); err != nil {
		return err
	}
	if err := global.DB.AutoMigrate(&model.Property{}); err != nil {
		return err
	}
	if err := global.DB.AutoMigrate(&model.ResourceSharer{}); err != nil {
		return err
	}
	if err := global.DB.AutoMigrate(&model.UserGroup{}); err != nil {
		return err
	}
	if err := global.DB.AutoMigrate(&model.UserGroupMember{}); err != nil {
		return err
	}
	if err := global.DB.AutoMigrate(&model.LoginLog{}); err != nil {
		return err
	}
	if err := global.DB.AutoMigrate(&model.Num{}); err != nil {
		return err
	}

	if len(model.FindAllTemp()) == 0 {
		for i := 0; i <= 30; i++ {
			if err := model.CreateNewTemp(&model.Num{I: strconv.Itoa(i)}); err != nil {
				return err
			}
		}
	}

	// 配置缓存器
	global.Cache = cache.New(5*time.Minute, 10*time.Minute)
	global.Cache.OnEvicted(func(key string, value interface{}) {
		logrus.Debugf("用户Token「%v」过期", key)
		model.Logout(key)
	})
	global.Store = global.NewStore()

	loginLogs, err := model.FindAliveLoginLogs()
	if err != nil {
		return err
	}

	for i := range loginLogs {
		loginLog := loginLogs[i]
		token := loginLog.ID
		user, err := model.FindUserById(loginLog.UserId)
		if err != nil {
			logrus.Debugf("用户「%v」获取失败，忽略", loginLog.UserId)
			continue
		}

		authorization := api.Authorization{
			Token:    token,
			Remember: loginLog.Remember,
			User:     user,
		}

		if authorization.Remember {
			// 记住登录有效期两周
			global.Cache.Set(token, authorization, api.RememberEffectiveTime)
		} else {
			global.Cache.Set(token, authorization, api.NotRememberEffectiveTime)
		}
		logrus.Debugf("重新加载用户「%v」授权Token「%v」到缓存", user.Nickname, token)
	}

	e := api.SetupRoutes()
	if err := handle.InitProperties(); err != nil {
		return err
	}
	// 启动定时任务
	go handle.RunTicker()
	go handle.RunDataFix()

	return e.Start(global.Config.Server.Addr)
}
