package global

import (
	"github.com/patrickmn/go-cache"
	"gorm.io/gorm"
	"next-terminal/pkg/config"
)

var DB *gorm.DB

var Cache *cache.Cache

var Config *config.Config

var Store *TunStore
