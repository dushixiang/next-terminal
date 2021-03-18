package main

import (
	"bytes"
	"fmt"
	nested "github.com/antonfisher/nested-logrus-formatter"
	"github.com/labstack/gommon/log"
	"github.com/robfig/cron/v3"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
	"io"
	"next-terminal/server/api"
	"next-terminal/server/config"
	"next-terminal/server/global"
	"os"
)

const Version = "v0.3.3"

var (
	db *gorm.DB
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
	db = config.SetupDB()

	//if global.Config.ResetPassword != "" {
	//	return ResetPassword()
	//}

	if err := api.ReloadAccessSecurity(); err != nil {
		return err
	}

	global.Store = global.NewStore()
	global.Cron = cron.New(cron.WithSeconds()) //精确到秒
	global.Cron.Start()

	e := api.SetupRoutes(db)
	global.Cache = api.SetupCache()

	api.SetupTicker()

	go handle.RunDataFix()

	if global.Config.Server.Cert != "" && global.Config.Server.Key != "" {
		return e.StartTLS(global.Config.Server.Addr, global.Config.Server.Cert, global.Config.Server.Key)
	} else {
		return e.Start(global.Config.Server.Addr)
	}

}
