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
	db, ok := c.Value(constant.DB).(*gorm.DB)
	if !ok {
		return env.GetDB()
	}
	return db
}
