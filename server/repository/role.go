package repository

import (
	"context"

	"next-terminal/server/model"
)

var RoleRepository = new(roleRepository)

type roleRepository struct {
	baseRepository
}

func (r roleRepository) ExistsById(c context.Context, id string) (exist bool, err error) {
	m := model.Role{}
	var count uint64
	err = r.GetDB(c).Table(m.TableName()).Select("count(*)").
		Where("id = ?", id).
		Find(&count).
		Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r roleRepository) FindAll(c context.Context) (o []model.Role, err error) {
	err = r.GetDB(c).Order("name desc").Find(&o).Error
	return
}

func (r roleRepository) Find(c context.Context, pageIndex, pageSize int, name, _type, order, field string) (o []model.Role, total int64, err error) {
	m := model.Role{}
	db := r.GetDB(c).Table(m.TableName())
	dbCounter := r.GetDB(c).Table(m.TableName())

	if len(name) > 0 {
		db = db.Where("name like ?", "%"+name+"%")
		dbCounter = dbCounter.Where("name like ?", "%"+name+"%")
	}

	if _type != "" {
		db = db.Where("type = ?", _type)
		dbCounter = dbCounter.Where("type = ?", _type)
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
		o = make([]model.Role, 0)
	}
	return
}

func (r roleRepository) DeleteById(c context.Context, id string) error {
	return r.GetDB(c).Where("id = ?", id).Delete(model.Role{}).Error
}

func (r roleRepository) Create(c context.Context, m *model.Role) error {
	return r.GetDB(c).Create(m).Error
}

func (r roleRepository) UpdateById(c context.Context, o *model.Role, id string) error {
	o.ID = id
	return r.GetDB(c).Updates(o).Error
}

func (r roleRepository) FindById(c context.Context, id string) (m model.Role, err error) {
	err = r.GetDB(c).Where("id = ?", id).First(&m).Error
	return
}
