package main

import (
	"encoding/json"
	"fmt"

	"next-terminal/server/api"
	"next-terminal/server/config"
	"next-terminal/server/constant"
	"next-terminal/server/repository"
	"next-terminal/server/task"

	"github.com/labstack/gommon/log"
)

func main() {
	err := Run()
	if err != nil {
		log.Fatal(err)
	}
}

func Run() error {

	fmt.Printf(constant.Banner, constant.Version)

	if config.GlobalCfg.Debug {
		jsonBytes, err := json.MarshalIndent(config.GlobalCfg, "", "    ")
		if err != nil {
			return err
		}
		fmt.Printf("当前配置为: %v\n", string(jsonBytes))
	}

	db := api.SetupDB()
	e := api.SetupRoutes(db)

	if config.GlobalCfg.ResetPassword != "" {
		return api.ResetPassword(config.GlobalCfg.ResetPassword)
	}
	if config.GlobalCfg.ResetTotp != "" {
		return api.ResetTotp(config.GlobalCfg.ResetTotp)
	}

	if config.GlobalCfg.NewEncryptionKey != "" {
		return api.ChangeEncryptionKey(config.GlobalCfg.EncryptionKey, config.GlobalCfg.NewEncryptionKey)
	}

	sessionRepo := repository.NewSessionRepository(db)
	propertyRepo := repository.NewPropertyRepository(db)
	loginLogRepo := repository.NewLoginLogRepository(db)
	jobLogRepo := repository.NewJobLogRepository(db)
	ticker := task.NewTicker(sessionRepo, propertyRepo, loginLogRepo, jobLogRepo)
	ticker.SetupTicker()

	if config.GlobalCfg.Server.Cert != "" && config.GlobalCfg.Server.Key != "" {
		return e.StartTLS(config.GlobalCfg.Server.Addr, config.GlobalCfg.Server.Cert, config.GlobalCfg.Server.Key)
	} else {
		return e.Start(config.GlobalCfg.Server.Addr)
	}

}
