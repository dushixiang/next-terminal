package main

import (
	"github.com/labstack/gommon/log"
	"github.com/patrickmn/go-cache"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"next-terminal/pkg/api"
	"next-terminal/pkg/config"
	"next-terminal/pkg/handle"
	"next-terminal/pkg/model"
	"next-terminal/pkg/utils"
	"strconv"
	"time"
)

func main() {
	log.Fatal(Run())
}

func Run() error {
	config.NextTerminal = config.SetupConfig()

	var err error
	//config.DB, err = gorm.Open(mysql.Open(config.NextTerminal.Dsn), &gorm.Config{
	//	Logger: logger.Default.LogMode(logger.Info),
	//})
	config.DB, err = gorm.Open(sqlite.Open("next-terminal.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("连接数据库异常", err)
	}

	if err := config.DB.AutoMigrate(&model.User{}); err != nil {
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

	if err := config.DB.AutoMigrate(&model.Asset{}); err != nil {
		return err
	}
	if err := config.DB.AutoMigrate(&model.Session{}); err != nil {
		return err
	}
	if err := config.DB.AutoMigrate(&model.Command{}); err != nil {
		return err
	}
	if err := config.DB.AutoMigrate(&model.Credential{}); err != nil {
		return err
	}
	if err := config.DB.AutoMigrate(&model.Property{}); err != nil {
		return err
	}

	if err := config.DB.AutoMigrate(&model.Num{}); err != nil {
		return err
	}

	if len(model.FindAllTemp()) == 0 {
		for i := 0; i <= 30; i++ {
			if err := model.CreateNewTemp(&model.Num{I: strconv.Itoa(i)}); err != nil {
				return err
			}
		}
	}

	config.Cache = cache.New(5*time.Minute, 10*time.Minute)
	config.Store = config.NewStore()
	e := api.SetupRoutes()
	// 启动定时任务
	//go handle.RunTicker()
	go handle.RunDataFix()
	go handle.InitProperties()

	return e.Start(config.NextTerminal.Addr)
}
