package repository

import (
	"context"

	"next-terminal/server/dto"
	"next-terminal/server/model"
)

var StorageLogRepository = new(storageLogRepository)

type storageLogRepository struct {
	baseRepository
}

func (r storageLogRepository) DeleteById(c context.Context, id string) error {
	return r.GetDB(c).Where("id = ?", id).Delete(model.StorageLog{}).Error
}

func (r storageLogRepository) DeleteAll(c context.Context) error {
	return r.GetDB(c).Where("1 = 1").Delete(model.StorageLog{}).Error
}

func (r storageLogRepository) Create(c context.Context, m *model.StorageLog) error {
	return r.GetDB(c).Create(m).Error
}

func (r storageLogRepository) FindById(c context.Context, id string) (m model.StorageLog, err error) {
	err = r.GetDB(c).Where("id = ?", id).First(&m).Error
	return
}

func (r storageLogRepository) Find(c context.Context, pageIndex, pageSize int, assetId, userId, action, order, field string) (o []dto.StorageLogForPage, total int64, err error) {
	db := r.GetDB(c).Table("storage_logs").Select("storage_logs.*, assets.name as asset_name, users.nickname as user_name").
		Joins("left join assets on storage_logs.asset_id = assets.id").
		Joins("left join users  on storage_logs.user_id  = users.id")
	dbCounter := r.GetDB(c).Table("storage_logs").
		Joins("left join assets on storage_logs.asset_id = assets.id").
		Joins("left join users  on storage_logs.user_id  = users.id")

	if len(assetId) > 0 {
		db = db.Where("storage_logs.asset_id = ?", assetId)
		dbCounter = dbCounter.Where("storage_logs.asset_id = ?", assetId)
	}

	if len(userId) > 0 {
		db = db.Where("storage_logs.user_id = ?", userId)
		dbCounter = dbCounter.Where("storage_logs.user_id = ?", userId)
	}

	if len(action) > 0 {
		db = db.Where("storage_logs.action = ?", action)
		dbCounter = dbCounter.Where("storage_logs.action = ?", action)
	}

	err = dbCounter.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	if order == "" {
		order = "desc"
	} else if order == "ascend" {
		order = "asc"
	} else {
		order = "desc"
	}

	if field == "" {
		field = "storage_logs.created"
	}

	err = db.Order(field + " " + order).Find(&o).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Error
	if o == nil {
		o = make([]dto.StorageLogForPage, 0)
	}
	return
}
