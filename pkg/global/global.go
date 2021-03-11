package global

import (
	"github.com/patrickmn/go-cache"
	"github.com/robfig/cron/v3"
	"gorm.io/gorm"
	"next-terminal/pkg/config"
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
