package model

import "next-terminal/pkg/global"

type UserGroupMember struct {
	ID          string `gorm:"primary_key" json:"name"`
	UserId      string `gorm:"index" json:"userId"`
	UserGroupId string `gorm:"index" json:"userGroupId"`
}

func (r *UserGroupMember) TableName() string {
	return "user_group_members"
}

func FindUserGroupMembersByUserGroupId(id string) (o []string, err error) {
	err = global.DB.Table("user_group_members").Select("user_id").Where("user_group_id = ?", id).Find(&o).Error
	return
}
