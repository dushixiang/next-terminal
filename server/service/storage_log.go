package service

import (
	"context"

	"next-terminal/server/common"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"
)

var StorageLogService = new(storageLogService)

type storageLogService struct {
	baseService
}

func (s storageLogService) Save(ctx context.Context, assetId, sessionId, userId, action, filename string) error {
	storageLog := &model.StorageLog{
		ID:        utils.UUID(),
		AssetId:   assetId,
		SessionId: sessionId,
		UserId:    userId,
		Action:    action,
		FileName:  filename,
		Created:   common.NowJsonTime(),
	}
	return repository.StorageLogRepository.Create(ctx, storageLog)
}
