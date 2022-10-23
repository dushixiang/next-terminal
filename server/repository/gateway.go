package repository

import (
	"context"

	"next-terminal/server/model"
)

var GatewayRepository = new(gatewayRepository)

type gatewayRepository struct {
	baseRepository
}

func (r gatewayRepository) Find(c context.Context, pageIndex, pageSize int, ip, name, order, field string) (o []model.AccessGatewayForPage, total int64, err error) {
	t := model.AccessGateway{}
	db := r.GetDB(c).Table(t.TableName())
	dbCounter := r.GetDB(c).Table(t.TableName())

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

func (r gatewayRepository) Create(c context.Context, o *model.AccessGateway) error {
	return r.GetDB(c).Create(o).Error
}

func (r gatewayRepository) UpdateById(c context.Context, o *model.AccessGateway, id string) error {
	o.ID = id
	return r.GetDB(c).Updates(o).Error
}

func (r gatewayRepository) DeleteById(c context.Context, id string) error {
	return r.GetDB(c).Where("id = ?", id).Delete(model.AccessGateway{}).Error
}

func (r gatewayRepository) FindById(c context.Context, id string) (o model.AccessGateway, err error) {
	err = r.GetDB(c).Where("id = ?", id).First(&o).Error
	return
}

func (r gatewayRepository) FindAll(c context.Context) (o []model.AccessGateway, err error) {
	err = r.GetDB(c).Find(&o).Error
	return
}
