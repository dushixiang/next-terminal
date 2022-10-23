package repository

import (
	"context"

	"next-terminal/server/model"
)

var AccessTokenRepository = new(accessTokenRepository)

type accessTokenRepository struct {
	baseRepository
}

func (repo accessTokenRepository) FindByUserId(ctx context.Context, userId string) (o model.AccessToken, err error) {
	err = repo.GetDB(ctx).Where("user_id = ?", userId).First(&o).Error
	return
}

func (repo accessTokenRepository) DeleteByUserId(ctx context.Context, userId string) error {
	return repo.GetDB(ctx).Where("user_id = ?", userId).Delete(&model.AccessToken{}).Error
}

func (repo accessTokenRepository) Create(ctx context.Context, o *model.AccessToken) error {
	return repo.GetDB(ctx).Create(o).Error
}

func (repo accessTokenRepository) FindAll(ctx context.Context) (o []model.AccessToken, err error) {
	err = repo.GetDB(ctx).Find(&o).Error
	return
}
