package global

import (
	"next-terminal/pkg/config"

	"github.com/patrickmn/go-cache"
	"github.com/robfig/cron/v3"
)

var Cache *cache.Cache

var Config *config.Config

var Store *TunStore

var Cron *cron.Cron

type Security struct {
	Rule string
	IP   string
}

var Securities []*Security

func init() {
	Cron = cron.New(cron.WithSeconds())
	Cron.Start()
}
