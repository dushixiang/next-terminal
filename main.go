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

func main() {
	log.Fatal(Run())
}

func Run() error {

	var err error
	//logrus.SetReportCaller(true)
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

	logrus.Infof("当前数据库模式为：%v", global.Config.DB)
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

	if len(model.FindAllUser()) == 0 {

		var pass []byte
		if pass, err = utils.Encoder.Encode([]byte("admin")); err != nil {
			return err
		}

		user := model.User{
			ID:       utils.UUID(),
			Username: "admin",
			Password: string(pass),
			Nickname: "超级管理员",
			Created:  utils.NowJsonTime(),
		}
		if err := model.CreateNewUser(&user); err != nil {
			return err
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

	global.Cache = cache.New(5*time.Minute, 10*time.Minute)
	global.Store = global.NewStore()
	e := api.SetupRoutes()
	if err := handle.InitProperties(); err != nil {
		return err
	}
	// 启动定时任务
	go handle.RunTicker()
	go handle.RunDataFix()

	return e.Start(global.Config.Server.Addr)
}
