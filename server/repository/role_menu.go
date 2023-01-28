package repository

import (
	"context"

	"next-terminal/server/model"
)

var RoleMenuRefRepository = &roleMenuRefRepository{}

type roleMenuRefRepository struct {
	baseRepository
}

func (r roleMenuRefRepository) CreateInBatches(ctx context.Context, items []*model.RoleMenuRef) error {
	return r.GetDB(ctx).CreateInBatches(items, 100).Error
}

func (r roleMenuRefRepository) FindByRoleId(ctx context.Context, roleId string) (items []model.RoleMenuRef, err error) {
	err = r.GetDB(ctx).Where("role_id = ?", roleId).Find(&items).Error
	return
}

func (r roleMenuRefRepository) DeleteByRoleId(ctx context.Context, roleId string) error {
	return r.GetDB(ctx).Where("role_id = ?", roleId).Delete(&model.RoleMenuRef{}).Error
}

func (r roleMenuRefRepository) DeleteByIdIn(ctx context.Context, array []string) error {
	return r.GetDB(ctx).Where("id in ?", array).Delete(&model.RoleMenuRef{}).Error
}
