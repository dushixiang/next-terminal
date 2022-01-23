package repository

import (
	"context"

	"next-terminal/server/model"
)

type securityRepository struct {
	baseRepository
}

func (r securityRepository) FindAll(c context.Context) (o []model.AccessSecurity, err error) {
	err = r.GetDB(c).Order("priority asc").Find(&o).Error
	return
}

func (r securityRepository) Find(c context.Context, pageIndex, pageSize int, ip, rule, order, field string) (o []model.AccessSecurity, total int64, err error) {
	t := model.AccessSecurity{}
	db := r.GetDB(c).Table(t.TableName())
	dbCounter := r.GetDB(c).Table(t.TableName())

	if len(ip) > 0 {
		db = db.Where("ip like ?", "%"+ip+"%")
		dbCounter = dbCounter.Where("ip like ?", "%"+ip+"%")
	}

	if len(rule) > 0 {
		db = db.Where("rule = ?", rule)
		dbCounter = dbCounter.Where("rule = ?", rule)
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
	} else if field == "rule" {
		field = "rule"
	} else {
		field = "priority"
	}

	err = db.Order(field + " " + order).Find(&o).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Error
	if o == nil {
		o = make([]model.AccessSecurity, 0)
	}
	return
}

func (r securityRepository) Create(c context.Context, o *model.AccessSecurity) error {
	return r.GetDB(c).Create(o).Error
}

func (r securityRepository) UpdateById(c context.Context, o *model.AccessSecurity, id string) error {
	o.ID = id
	return r.GetDB(c).Updates(o).Error
}

func (r securityRepository) DeleteById(c context.Context, id string) error {
	return r.GetDB(c).Where("id = ?", id).Delete(model.AccessSecurity{}).Error
}

func (r securityRepository) FindById(c context.Context, id string) (o *model.AccessSecurity, err error) {
	err = r.GetDB(c).Where("id = ?", id).First(&o).Error
	return
}
