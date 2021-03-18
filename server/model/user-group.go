package model

import (
	"next-terminal/server/utils"
)

type UserGroup struct {
	ID         string         `gorm:"primary_key" json:"id"`
	Name       string         `json:"name"`
	Created    utils.JsonTime `json:"created"`
	AssetCount int64          `gorm:"-" json:"assetCount"`
}

func (r *UserGroup) TableName() string {
	return "user_groups"
}

type UserGroupMember struct {
	ID          string `gorm:"primary_key" json:"name"`
	UserId      string `gorm:"index" json:"userId"`
	UserGroupId string `gorm:"index" json:"userGroupId"`
}

func (r *UserGroupMember) TableName() string {
	return "user_group_members"
}
