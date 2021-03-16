package global

import (
	"next-terminal/pkg/config"

	"github.com/patrickmn/go-cache"
	"github.com/robfig/cron/v3"
	"gorm.io/gorm"
)

var DB *gorm.DB

var Cache *cache.Cache

var Config *config.Config

var Store *TunStore

var Cron *cron.Cron

type Security struct {
	Rule string
	IP   string
}

var Securities []*Security
