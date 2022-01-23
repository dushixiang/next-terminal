package env

import "gorm.io/gorm"

var env *Env

type Env struct {
	db *gorm.DB
}

func init() {
	env = &Env{
		db: setupDB(),
	}
}

func GetDB() *gorm.DB {
	return env.db
}
