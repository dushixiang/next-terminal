package app

import (
	"next-terminal/server/global/cache"
	"next-terminal/server/service"
)

func setupCache() {
	cache.TokenManager.OnEvicted(service.UserService.OnEvicted)
}
