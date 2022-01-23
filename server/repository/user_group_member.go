package repository

import (
	"context"

	"next-terminal/server/model"
)

type userGroupMemberRepository struct {
	baseRepository
}

func (r userGroupMemberRepository) FindUserIdsByUserGroupId(c context.Context, userGroupId string) (o []string, err error) {
	err = r.GetDB(c).Table("user_group_members").Select("user_id").Where("user_group_id = ?", userGroupId).Find(&o).Error
	return
}

func (r userGroupMemberRepository) FindUserGroupIdsByUserId(c context.Context, userId string) (o []string, err error) {
	// 先查询用户所在的用户
	err = r.GetDB(c).Table("user_group_members").Select("user_group_id").Where("user_id = ?", userId).Find(&o).Error
	return
}

func (r userGroupMemberRepository) Create(c context.Context, o *model.UserGroupMember) error {
	return r.GetDB(c).Create(o).Error
}

func (r userGroupMemberRepository) DeleteByUserId(c context.Context, userId string) error {
	return r.GetDB(c).Where("user_id = ?", userId).Delete(&model.UserGroupMember{}).Error
}

func (r userGroupMemberRepository) DeleteByUserGroupId(c context.Context, userGroupId string) error {
	return r.GetDB(c).Where("user_group_id = ?", userGroupId).Delete(&model.UserGroupMember{}).Error
}
