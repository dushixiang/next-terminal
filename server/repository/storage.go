package repository

import (
	"context"

	"next-terminal/server/model"
)

var StorageRepository = new(storageRepository)

type storageRepository struct {
	baseRepository
}

func (r storageRepository) Find(c context.Context, pageIndex, pageSize int, name, order, field string) (o []model.StorageForPage, total int64, err error) {
	m := model.Storage{}
	db := r.GetDB(c).Table(m.TableName()).Select("storages.id,storages.name,storages.is_share,storages.limit_size,storages.is_default,storages.owner,storages.created, users.nickname as owner_name").Joins("left join users on storages.owner = users.id")
	dbCounter := r.GetDB(c).Table(m.TableName())

	if len(name) > 0 {
		db = db.Where("name like ?", "%"+name+"%")
		dbCounter = dbCounter.Where("name like ?", "%"+name+"%")
	}

	err = dbCounter.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	if order == "ascend" {
		order = "asc"
	} else {
		order = "desc"
	}

	if field == "name" {
		field = "storages.name"
	} else {
		field = "storages.created"
	}

	err = db.Order(field + " " + order).Find(&o).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Error
	if o == nil {
		o = make([]model.StorageForPage, 0)
	}
	return
}

func (r storageRepository) FindShares(c context.Context) (o []model.Storage, err error) {
	m := model.Storage{}
	db := r.GetDB(c).Table(m.TableName()).Where("is_share = 1")
	err = db.Find(&o).Error
	return
}

func (r storageRepository) DeleteById(c context.Context, id string) error {
	return r.GetDB(c).Where("id = ?", id).Delete(model.Storage{}).Error
}

func (r storageRepository) Create(c context.Context, m *model.Storage) error {
	return r.GetDB(c).Create(m).Error
}

func (r storageRepository) UpdateById(c context.Context, o *model.Storage, id string) error {
	o.ID = id
	return r.GetDB(c).Updates(o).Error
}

// Save 保存所有的字段，即使字段是零值
func (r storageRepository) SaveById(ctx context.Context, m *model.Storage, id string) (err error) {
	m.ID = id
	db := r.GetDB(ctx)
	err = db.Save(m).Error
	return
}

func (r storageRepository) FindByOwnerIdAndDefault(c context.Context, owner string, isDefault bool) (m model.Storage, err error) {
	err = r.GetDB(c).Where("owner = ? and is_default = ?", owner, isDefault).First(&m).Error
	return
}

func (r storageRepository) FindById(c context.Context, id string) (m model.Storage, err error) {
	err = r.GetDB(c).Where("id = ?", id).First(&m).Error
	return
}

func (r storageRepository) FindAll(c context.Context) (o []model.Storage, err error) {
	err = r.GetDB(c).Find(&o).Error
	return
}
