package repository

import (
	"context"

	"next-terminal/server/model"
)

var UserRoleRefRepository = new(userRoleRefRepository)

type userRoleRefRepository struct {
	baseRepository
}

func (r userRoleRefRepository) Create(c context.Context, m *model.UserRoleRef) error {
	return r.GetDB(c).Create(m).Error
}

func (r userRoleRefRepository) DeleteByUserId(c context.Context, userId string) error {
	return r.GetDB(c).Where("user_id = ?", userId).Delete(model.UserRoleRef{}).Error
}

func (r userRoleRefRepository) FindByUserId(c context.Context, userId string) (items []model.UserRoleRef, err error) {
	err = r.GetDB(c).Where("user_id = ?", userId).Find(&items).Error
	return
}

func (r userRoleRefRepository) DeleteByRoleId(c context.Context, roleId string) error {
	return r.GetDB(c).Where("role_id = ?", roleId).Delete(model.UserRoleRef{}).Error
}
