package model

import (
	"next-terminal/server/common"
)

type UserGroup struct {
	ID      string          `gorm:"primary_key,type:varchar(36)" json:"id"`
	Name    string          `gorm:"type:varchar(500)" json:"name"`
	Created common.JsonTime `json:"created"`
	Members []string        `gorm:"-" json:"members"`
}

type UserGroupForPage struct {
	ID         string          `json:"id"`
	Name       string          `json:"name"`
	Created    common.JsonTime `json:"created"`
	AssetCount int64           `json:"assetCount"`
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
