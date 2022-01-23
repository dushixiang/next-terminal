package repository

import (
	"context"

	"next-terminal/server/constant"
	"next-terminal/server/env"

	"gorm.io/gorm"
)

type baseRepository struct {
}

func (b *baseRepository) GetDB(c context.Context) *gorm.DB {
	db := c.Value(constant.DB)
	if db == nil {
		return env.GetDB()
	}
	switch val := db.(type) {
	case gorm.DB:
		return &val
	default:
		return env.GetDB()
	}
}
