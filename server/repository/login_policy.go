package repository

import (
	"context"

	"next-terminal/server/model"
)

var LoginPolicyRepository = new(loginPolicyRepository)

type loginPolicyRepository struct {
	baseRepository
}

func (r loginPolicyRepository) Find(c context.Context, pageIndex, pageSize int, name, userId, order, field string) (o []model.LoginPolicy, total int64, err error) {
	m := model.LoginPolicy{}
	db := r.GetDB(c).Table(m.TableName()).Joins("left join login_policies_ref as ref on login_policies.id = ref.login_policy_id").Group("login_policies.id")
	dbCounter := r.GetDB(c).Table(m.TableName()).Joins("left join login_policies_ref as ref on login_policies.id = ref.login_policy_id").Group("login_policies.id")

	if len(name) > 0 {
		db = db.Where("login_policies.name like ?", "%"+name+"%")
		dbCounter = dbCounter.Where("login_policies.name like ?", "%"+name+"%")
	}

	if len(userId) > 0 {
		db = db.Where("ref.user_id = ?", userId)
		dbCounter = dbCounter.Where("ref.user_id = ?", userId)
	}

	err = dbCounter.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	if order == "" {
		order = "asc"
	} else if order == "ascend" {
		order = "asc"
	} else {
		order = "desc"
	}

	if field == "name" {
		field = "login_policies.name"
	} else {
		field = "login_policies.priority"
	}

	err = db.Order(field + " " + order).Find(&o).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Error
	if o == nil {
		o = make([]model.LoginPolicy, 0)
	}
	return
}

func (r loginPolicyRepository) FindByUserId(c context.Context, userId string) (items []model.LoginPolicy, err error) {
	m := model.LoginPolicy{}
	db := r.GetDB(c).Table(m.TableName()).Joins("left join login_policies_ref as ref on login_policies.id = ref.login_policy_id")
	err = db.Where("ref.user_id = ?", userId).Order("login_policies.priority desc").Find(&items).Error
	return
}

func (r loginPolicyRepository) DeleteById(c context.Context, id string) error {
	return r.GetDB(c).Where("id = ?", id).Delete(model.LoginPolicy{}).Error
}

func (r loginPolicyRepository) Create(c context.Context, m *model.LoginPolicy) error {
	return r.GetDB(c).Create(m).Error
}

func (r loginPolicyRepository) UpdateById(c context.Context, o *model.LoginPolicy, id string) error {
	o.ID = id
	return r.GetDB(c).Updates(o).Error
}

func (r loginPolicyRepository) FindById(c context.Context, id string) (m model.LoginPolicy, err error) {
	err = r.GetDB(c).Where("id = ?", id).First(&m).Error
	return
}
