package service

import (
	"context"
	"errors"

	"next-terminal/server/common"
	"next-terminal/server/common/nt"
	"next-terminal/server/dto"
	"next-terminal/server/env"
	"next-terminal/server/global/cache"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"

	"gorm.io/gorm"
)

var AccessTokenService = new(accessTokenService)

type accessTokenService struct {
	baseService
}

func (service accessTokenService) GenAccessToken(userId string) error {
	return env.GetDB().Transaction(func(tx *gorm.DB) error {
		ctx := service.Context(tx)

		if err := service.DelAccessToken(ctx, userId); err != nil {
			return err
		}

		user, err := repository.UserRepository.FindById(ctx, userId)
		if err != nil {
			return err
		}

		token := "forever-" + utils.UUID()
		accessToken := &model.AccessToken{
			ID:      utils.UUID(),
			UserId:  userId,
			Token:   token,
			Created: common.NowJsonTime(),
		}

		authorization := dto.Authorization{
			Token:    token,
			Remember: false,
			Type:     nt.AccessToken,
			User:     &user,
		}

		cache.TokenManager.Set(token, authorization, cache.NoExpiration)

		return repository.AccessTokenRepository.Create(ctx, accessToken)
	})
}

func (service accessTokenService) Reload() error {
	accessTokens, err := repository.AccessTokenRepository.FindAll(context.TODO())
	if err != nil {
		return err
	}
	for _, accessToken := range accessTokens {
		user, err := repository.UserRepository.FindById(context.TODO(), accessToken.UserId)
		if err != nil {
			return err
		}
		authorization := dto.Authorization{
			Token:    accessToken.Token,
			Remember: false,
			Type:     nt.AccessToken,
			User:     &user,
		}

		cache.TokenManager.Set(accessToken.Token, authorization, cache.NoExpiration)
	}
	return nil
}

func (service accessTokenService) DelAccessToken(ctx context.Context, userId string) error {
	oldAccessToken, err := repository.AccessTokenRepository.FindByUserId(ctx, userId)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	if oldAccessToken.Token != "" {
		cache.TokenManager.Delete(oldAccessToken.Token)
	}
	return repository.AccessTokenRepository.DeleteByUserId(ctx, userId)
}
