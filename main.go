package main

import (
	"fmt"

	"next-terminal/pkg/config"
	"next-terminal/pkg/global"
	"next-terminal/pkg/task"
	"next-terminal/server/api"
	"next-terminal/server/repository"

	"github.com/labstack/gommon/log"
	"github.com/robfig/cron/v3"
)

const Version = "v0.3.4"

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

	global.Config = config.SetupConfig()

	global.Store = global.NewStore()
	global.Cron = cron.New(cron.WithSeconds()) //精确到秒
	global.Cron.Start()

	db := api.SetupDB()
	e := api.SetupRoutes(db)
	global.Cache = api.SetupCache()
	if global.Config.ResetPassword != "" {
		return api.ResetPassword()
	}
	sessionRepo := repository.NewSessionRepository(db)
	propertyREpo := repository.NewPropertyRepository(db)
	ticker := task.NewTicker(sessionRepo, propertyREpo)
	ticker.SetupTicker()

	if global.Config.Server.Cert != "" && global.Config.Server.Key != "" {
		return e.StartTLS(global.Config.Server.Addr, global.Config.Server.Cert, global.Config.Server.Key)
	} else {
		return e.Start(global.Config.Server.Addr)
	}

}
