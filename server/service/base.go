package service

import (
	"context"

	"next-terminal/server/constant"

	"gorm.io/gorm"
)

type baseService struct {
}

func (service baseService) Context(db *gorm.DB) context.Context {
	return context.WithValue(context.TODO(), constant.DB, db)
}

func (service baseService) InTransaction(ctx context.Context) bool {
	_, ok := ctx.Value(constant.DB).(*gorm.DB)
	return ok
}
