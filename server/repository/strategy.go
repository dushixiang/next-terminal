package repository

import (
	"context"

	"next-terminal/server/model"
)

type strategyRepository struct {
	baseRepository
}

func (r strategyRepository) FindAll(c context.Context) (o []model.Strategy, err error) {
	err = r.GetDB(c).Order("name desc").Find(&o).Error
	return
}

func (r strategyRepository) Find(c context.Context, pageIndex, pageSize int, name, order, field string) (o []model.Strategy, total int64, err error) {
	m := model.Strategy{}
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
		o = make([]model.Strategy, 0)
	}
	return
}

func (r strategyRepository) DeleteById(c context.Context, id string) error {
	return r.GetDB(c).Where("id = ?", id).Delete(model.Strategy{}).Error
}

func (r strategyRepository) Create(c context.Context, m *model.Strategy) error {
	return r.GetDB(c).Create(m).Error
}

func (r strategyRepository) UpdateById(c context.Context, o *model.Strategy, id string) error {
	o.ID = id
	return r.GetDB(c).Updates(o).Error
}

func (r strategyRepository) FindById(c context.Context, id string) (m model.Strategy, err error) {
	err = r.GetDB(c).Where("id = ?", id).First(&m).Error
	return
}
