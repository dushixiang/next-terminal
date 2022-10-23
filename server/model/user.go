package model

import (
	"next-terminal/server/common"
)

type User struct {
	ID         string          `gorm:"primary_key,type:varchar(36)" json:"id"`
	Username   string          `gorm:"index,type:varchar(200)" json:"username"`
	Password   string          `gorm:"type:varchar(500)" json:"password"`
	Nickname   string          `gorm:"type:varchar(500)" json:"nickname"`
	TOTPSecret string          `json:"-"`
	Online     *bool           `json:"online"`
	Status     string          `gorm:"type:varchar(10)" json:"status"`
	Created    common.JsonTime `json:"created"`
	Type       string          `gorm:"type:varchar(20)" json:"type"`
	Mail       string          `gorm:"type:varchar(500)" json:"mail"`
	Source     string          `gorm:"type:varchar(20)" json:"source"`
	Roles      []string        `gorm:"-" json:"roles"`
}

type UserForPage struct {
	ID               string          `json:"id"`
	Username         string          `json:"username"`
	Nickname         string          `json:"nickname"`
	TOTPSecret       string          `json:"totpSecret"`
	Mail             string          `json:"mail"`
	Online           bool            `json:"online"`
	Status           string          `json:"status"`
	Created          common.JsonTime `json:"created"`
	Type             string          `json:"type"`
	Source           string          `json:"source"`
	SharerAssetCount int64           `json:"sharerAssetCount"`
}

func (r *User) TableName() string {
	return "users"
}
