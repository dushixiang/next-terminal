package repository

import (
	"next-terminal/server/model"

	"gorm.io/gorm"
)

type AccessGatewayRepository struct {
	DB *gorm.DB
}

func NewAccessGatewayRepository(db *gorm.DB) *AccessGatewayRepository {
	accessGatewayRepository = &AccessGatewayRepository{DB: db}
	return accessGatewayRepository
}

func (r AccessGatewayRepository) Find(pageIndex, pageSize int, ip, name, order, field string) (o []model.AccessGatewayForPage, total int64, err error) {
	t := model.AccessGateway{}
	db := r.DB.Table(t.TableName())
	dbCounter := r.DB.Table(t.TableName())

	if len(ip) > 0 {
		db = db.Where("ip like ?", "%"+ip+"%")
		dbCounter = dbCounter.Where("ip like ?", "%"+ip+"%")
	}

	if len(name) > 0 {
		db = db.Where("name like ?", "%"+name+"%")
		dbCounter = dbCounter.Where("name like ?", "%"+name+"%")
	}

	err = dbCounter.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	if order == "descend" {
		order = "desc"
	} else {
		order = "asc"
	}

	if field == "ip" {
		field = "ip"
	} else if field == "name" {
		field = "name"
	} else {
		field = "created"
	}

	err = db.Order(field + " " + order).Find(&o).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Error
	if o == nil {
		o = make([]model.AccessGatewayForPage, 0)
	}
	return
}

func (r AccessGatewayRepository) Create(o *model.AccessGateway) error {
	return r.DB.Create(o).Error
}

func (r AccessGatewayRepository) UpdateById(o *model.AccessGateway, id string) error {
	o.ID = id
	return r.DB.Updates(o).Error
}

func (r AccessGatewayRepository) DeleteById(id string) error {
	return r.DB.Where("id = ?", id).Delete(model.AccessGateway{}).Error
}

func (r AccessGatewayRepository) FindById(id string) (o model.AccessGateway, err error) {
	err = r.DB.Where("id = ?", id).First(&o).Error
	return
}

func (r AccessGatewayRepository) FindAll() (o []model.AccessGateway, err error) {
	err = r.DB.Find(&o).Error
	return
}
