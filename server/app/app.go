package app

import (
	"encoding/json"
	"fmt"

	"next-terminal/server/cli"
	"next-terminal/server/config"
	"next-terminal/server/constant"
	"next-terminal/server/service"

	"github.com/labstack/echo/v4"
)

var app *App

type App struct {
	Server *echo.Echo
}

func newApp() *App {
	return &App{}
}

func init() {
	setupCache()
	app = newApp()
	if err := app.InitDBData(); err != nil {
		panic(err)
	}
	if err := app.ReloadData(); err != nil {
		panic(err)
	}
	app.Server = setupRoutes()
}

func (app App) InitDBData() (err error) {
	if err := service.PropertyService.DeleteDeprecatedProperty(); err != nil {
		return err
	}
	if err := service.GatewayService.ReConnectAll(); err != nil {
		return err
	}
	if err := service.PropertyService.InitProperties(); err != nil {
		return err
	}
	if err := service.UserService.InitUser(); err != nil {
		return err
	}
	if err := service.JobService.InitJob(); err != nil {
		return err
	}
	if err := service.UserService.FixUserOnlineState(); err != nil {
		return err
	}
	if err := service.SessionService.FixSessionState(); err != nil {
		return err
	}
	if err := service.SessionService.EmptyPassword(); err != nil {
		return err
	}
	if err := service.CredentialService.EncryptAll(); err != nil {
		return err
	}
	if err := service.AssetService.EncryptAll(); err != nil {
		return err
	}
	if err := service.StorageService.InitStorages(); err != nil {
		return err
	}

	return nil
}

func (app App) ReloadData() error {
	if err := service.SecurityService.ReloadAccessSecurity(); err != nil {
		return err
	}
	if err := service.UserService.ReloadToken(); err != nil {
		return err
	}
	if err := service.AccessTokenService.Reload(); err != nil {
		return err
	}
	return nil
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

	_cli := cli.NewCli()

	if config.GlobalCfg.ResetPassword != "" {
		return _cli.ResetPassword(config.GlobalCfg.ResetPassword)
	}
	if config.GlobalCfg.ResetTotp != "" {
		return _cli.ResetTotp(config.GlobalCfg.ResetTotp)
	}

	if config.GlobalCfg.NewEncryptionKey != "" {
		return _cli.ChangeEncryptionKey(config.GlobalCfg.EncryptionKey, config.GlobalCfg.NewEncryptionKey)
	}

	if config.GlobalCfg.Server.Cert != "" && config.GlobalCfg.Server.Key != "" {
		return app.Server.StartTLS(config.GlobalCfg.Server.Addr, config.GlobalCfg.Server.Cert, config.GlobalCfg.Server.Key)
	} else {
		return app.Server.Start(config.GlobalCfg.Server.Addr)
	}
}
