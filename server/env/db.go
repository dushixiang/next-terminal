package env

import (
	"fmt"

	"next-terminal/server/config"
	"next-terminal/server/model"

	"github.com/glebarez/sqlite"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupDB() *gorm.DB {

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
		dsn := fmt.Sprintf("file:%s?cache=shared&mode=rwc", config.GlobalCfg.Sqlite.File)
		db, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{
			Logger:                 logMode,
			SkipDefaultTransaction: true,
		})
	}

	if err != nil {
		panic(fmt.Errorf("连接数据库异常: %v", err.Error()))
	}

	if err := db.AutoMigrate(&model.User{}, &model.Asset{}, &model.AssetAttribute{}, &model.Session{}, &model.Command{},
		&model.Credential{}, &model.Property{}, &model.UserGroup{}, &model.UserGroupMember{},
		&model.LoginLog{}, &model.Job{}, &model.JobLog{}, &model.AccessSecurity{}, &model.AccessGateway{},
		&model.Storage{}, &model.Strategy{},
		&model.AccessToken{}, &model.ShareSession{},
		&model.Role{}, &model.RoleMenuRef{}, &model.UserRoleRef{},
		&model.LoginPolicy{}, &model.LoginPolicyUserRef{}, &model.TimePeriod{},
		&model.StorageLog{}, &model.Authorised{}); err != nil {
		panic(fmt.Errorf("初始化数据库表结构异常: %v", err.Error()))
	}
	return db
}
