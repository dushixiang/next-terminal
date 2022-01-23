package main

import (
	"next-terminal/server/app"

	"github.com/labstack/gommon/log"
)

func main() {
	err := app.Run()
	if err != nil {
		log.Fatal(err)
	}
}
