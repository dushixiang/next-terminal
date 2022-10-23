package cache

import (
	"time"

	"github.com/patrickmn/go-cache"
)

const (
	NoExpiration          = -1
	RememberMeExpiration  = time.Hour * time.Duration(24*14)
	NotRememberExpiration = time.Hour * time.Duration(2)
	LoginLockExpiration   = time.Minute * time.Duration(5)
)

var TokenManager *cache.Cache
var LoginFailedKeyManager *cache.Cache
var UserRolesManager *cache.Cache

func init() {
	TokenManager = cache.New(5*time.Minute, 10*time.Minute)
	LoginFailedKeyManager = cache.New(5*time.Minute, 10*time.Minute)
	UserRolesManager = cache.New(5*time.Minute, 10*time.Minute)
}
