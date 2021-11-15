package repository

import (
	"next-terminal/server/model"

	"gorm.io/gorm"
)

type StorageRepository struct {
	DB *gorm.DB
}

func NewStorageRepository(db *gorm.DB) *StorageRepository {
	storageRepository = &StorageRepository{DB: db}
	return storageRepository
}

func (r StorageRepository) Find(pageIndex, pageSize int, name, order, field string) (o []model.StorageForPage, total int64, err error) {
	m := model.Storage{}
	db := r.DB.Table(m.TableName()).Select("storages.id,storages.name,storages.is_share,storages.limit_size,storages.is_default,storages.owner,storages.created, users.nickname as owner_name").Joins("left join users on storages.owner = users.id")
	dbCounter := r.DB.Table(m.TableName())

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

func (r StorageRepository) FindShares() (o []model.Storage, err error) {
	m := model.Storage{}
	db := r.DB.Table(m.TableName()).Where("is_share = 1")
	err = db.Find(&o).Error
	return
}

func (r StorageRepository) DeleteById(id string) error {
	return r.DB.Where("id = ?", id).Delete(model.Storage{}).Error
}

func (r StorageRepository) Create(m *model.Storage) error {
	return r.DB.Create(m).Error
}

func (r StorageRepository) UpdateById(o *model.Storage, id string) error {
	o.ID = id
	return r.DB.Updates(o).Error
}

func (r StorageRepository) FindByOwnerIdAndDefault(owner string, isDefault bool) (m model.Storage, err error) {
	err = r.DB.Where("owner = ? and is_default = ?", owner, isDefault).First(&m).Error
	return
}

func (r StorageRepository) FindById(id string) (m model.Storage, err error) {
	err = r.DB.Where("id = ?", id).First(&m).Error
	return
}

func (r StorageRepository) FindAll() (o []model.Storage, err error) {
	err = r.DB.Find(&o).Error
	return
}
