package repository

import (
	"context"

	"next-terminal/server/dto"
	"next-terminal/server/model"
)

var AuthorisedRepository = new(authorisedRepository)

type authorisedRepository struct {
	baseRepository
}

func (r authorisedRepository) Create(c context.Context, m *model.Authorised) error {
	return r.GetDB(c).Create(m).Error
}

func (r authorisedRepository) CreateInBatches(c context.Context, m []model.Authorised) error {
	return r.GetDB(c).CreateInBatches(m, 100).Error
}

func (r authorisedRepository) DeleteByUserId(c context.Context, userId string) error {
	return r.GetDB(c).Where("user_id = ?", userId).Delete(model.Authorised{}).Error
}

func (r authorisedRepository) DeleteByUserGroupId(c context.Context, userGroupId string) error {
	return r.GetDB(c).Where("user_group_id = ?", userGroupId).Delete(model.Authorised{}).Error
}

func (r authorisedRepository) DeleteByAssetId(c context.Context, assetId string) error {
	return r.GetDB(c).Where("asset_id = ?", assetId).Delete(model.Authorised{}).Error
}

func (r authorisedRepository) FindByUserId(c context.Context, userId string) (items []model.Authorised, err error) {
	err = r.GetDB(c).Where("user_id = ?", userId).Find(&items).Error
	return
}

func (r authorisedRepository) FindById(c context.Context, id string) (item model.Authorised, err error) {
	err = r.GetDB(c).Where("id = ?", id).First(&item).Error
	return
}

func (r authorisedRepository) FindByUserGroupId(c context.Context, userGroupId string) (items []model.Authorised, err error) {
	err = r.GetDB(c).Where("user_group_id = ?", userGroupId).Find(&items).Error
	return
}

func (r authorisedRepository) FindByUserGroupIdIn(c context.Context, userGroupIds []string) (items []model.Authorised, err error) {
	err = r.GetDB(c).Where("user_group_id in ?", userGroupIds).Find(&items).Error
	return
}

func (r authorisedRepository) FindAll(c context.Context, userId, userGroupId, assetId string) (items []model.Authorised, err error) {
	db := r.GetDB(c)
	if userId != "" {
		db = db.Where("user_id = ?", userId)
	}
	if userGroupId != "" {
		db = db.Where("user_group_id = ?", userGroupId)
	}
	if assetId != "" {
		db = db.Where("asset_id = ?", assetId)
	}
	err = db.Find(&items).Error
	return
}

func (r authorisedRepository) FindAssetPage(c context.Context, pageIndex, pageSize int, assetName, userId, userGroupId string) (o []dto.AssetPageForAuthorised, total int64, err error) {
	db := r.GetDB(c).Table("assets").
		Select("authorised.id, authorised.created, assets.id as asset_id, assets.name as asset_name, strategies.id as strategy_id, strategies.name as strategy_name ").
		Joins("left join authorised on authorised.asset_id = assets.id").
		Joins("left join strategies      on strategies.id      = authorised.strategy_id")
	dbCounter := r.GetDB(c).Table("assets").Joins("left join authorised on assets.id = authorised.asset_id").Group("assets.id")

	if assetName != "" {
		db = db.Where("assets.name like ?", "%"+assetName+"%")
		dbCounter = dbCounter.Where("assets.name like ?", "%"+assetName+"%")
	}

	if userId != "" {
		db = db.Where("authorised.user_id = ?", userId)
		dbCounter = dbCounter.Where("authorised.user_id = ?", userId)
	}

	if userGroupId != "" {
		db = db.Where("authorised.user_group_id = ?", userGroupId)
		dbCounter = dbCounter.Where("authorised.user_group_id = ?", userGroupId)
	}

	err = dbCounter.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	err = db.Order("authorised.created desc").Offset((pageIndex - 1) * pageSize).Limit(pageSize).Find(&o).Error
	if o == nil {
		o = make([]dto.AssetPageForAuthorised, 0)
	}
	return
}

func (r authorisedRepository) DeleteById(c context.Context, id string) error {
	return r.GetDB(c).Where("id = ?", id).Delete(model.Authorised{}).Error
}

func (r authorisedRepository) FindUserPage(c context.Context, pageIndex, pageSize int, userName, assetId string) (o []dto.UserPageForAuthorised, total int64, err error) {
	db := r.GetDB(c).Table("users").
		Select("authorised.id, authorised.created, users.id as user_id, users.nickname as user_name, strategies.id as strategy_id, strategies.name as strategy_name ").
		Joins("left join authorised on authorised.user_id = users.id").
		Joins("left join strategies      on strategies.id      = authorised.strategy_id")
	dbCounter := r.GetDB(c).Table("assets").Joins("left join authorised on assets.id = authorised.asset_id").Group("assets.id")

	if userName != "" {
		db = db.Where("users.nickname like ?", "%"+userName+"%")
		dbCounter = dbCounter.Where("users.nickname like ?", "%"+userName+"%")
	}

	if assetId != "" {
		db = db.Where("authorised.asset_id = ?", assetId)
		dbCounter = dbCounter.Where("authorised.asset_id = ?", assetId)
	}

	err = dbCounter.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	err = db.Order("authorised.created desc").Offset((pageIndex - 1) * pageSize).Limit(pageSize).Find(&o).Error
	if o == nil {
		o = make([]dto.UserPageForAuthorised, 0)
	}
	return
}

func (r authorisedRepository) FindUserGroupPage(c context.Context, pageIndex, pageSize int, userName, assetId string) (o []dto.UserGroupPageForAuthorised, total int64, err error) {
	db := r.GetDB(c).Table("user_groups").
		Select("authorised.id, authorised.created, user_groups.id as user_group_id, user_groups.name as user_group_name, strategies.id as strategy_id, strategies.name as strategy_name ").
		Joins("left join authorised on authorised.user_group_id = user_groups.id").
		Joins("left join strategies      on strategies.id      = authorised.strategy_id")
	dbCounter := r.GetDB(c).Table("assets").Joins("left join authorised on assets.id = authorised.asset_id").Group("assets.id")

	if userName != "" {
		db = db.Where("user_groups.name like ?", "%"+userName+"%")
		dbCounter = dbCounter.Where("user_groups.name like ?", "%"+userName+"%")
	}

	if assetId != "" {
		db = db.Where("authorised.asset_id = ?", assetId)
		dbCounter = dbCounter.Where("authorised.asset_id = ?", assetId)
	}

	err = dbCounter.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	err = db.Order("authorised.created desc").Offset((pageIndex - 1) * pageSize).Limit(pageSize).Find(&o).Error
	if o == nil {
		o = make([]dto.UserGroupPageForAuthorised, 0)
	}
	return
}
