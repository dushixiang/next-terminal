package config

import (
	"fmt"
	"github.com/sirupsen/logrus"
	"gorm.io/driver/mysql"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"next-terminal/server/global"
	"next-terminal/server/model"
)

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

	if err := db.AutoMigrate(&model.User{}, &model.Asset{}, &model.AssetAttribute{}, &model.Session{}, &model.Command{},
		&model.Credential{}, &model.Property{}, &model.ResourceSharer{}, &model.UserGroup{}, &model.UserGroupMember{},
		&model.LoginLog{}, &model.Num{}, &model.Job{}, &model.JobLog{}, &model.AccessSecurity{}); err != nil {
		logrus.WithError(err).Panic("初始化数据库表结构异常")
	}
	return db
}
