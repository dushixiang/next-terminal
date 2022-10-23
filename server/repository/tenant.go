package repository

import (
	"context"

	"next-terminal/server/model"
)

var TenantRepository = new(tenantRepository)

type tenantRepository struct {
	baseRepository
}

func (r tenantRepository) FindAll(c context.Context) (o []model.Tenant, err error) {
	err = r.GetDB(c).Order("name desc").Find(&o).Error
	return
}

func (r tenantRepository) Find(c context.Context, pageIndex, pageSize int, name, order, field string) (o []model.Tenant, total int64, err error) {
	m := model.Tenant{}
	db := r.GetDB(c).Table(m.TableName())
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
		field = "name"
	} else {
		field = "created"
	}

	err = db.Order(field + " " + order).Find(&o).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Error
	if o == nil {
		o = make([]model.Tenant, 0)
	}
	return
}

func (r tenantRepository) DeleteById(c context.Context, id string) error {
	return r.GetDB(c).Where("id = ?", id).Delete(model.Tenant{}).Error
}

func (r tenantRepository) Create(c context.Context, m *model.Tenant) error {
	return r.GetDB(c).Create(m).Error
}

func (r tenantRepository) UpdateById(c context.Context, o *model.Tenant, id string) error {
	o.ID = id
	return r.GetDB(c).Updates(o).Error
}

func (r tenantRepository) FindById(c context.Context, id string) (m model.Tenant, err error) {
	err = r.GetDB(c).Where("id = ?", id).First(&m).Error
	return
}
