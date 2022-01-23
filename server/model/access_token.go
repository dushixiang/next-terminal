package model

import "next-terminal/server/utils"

type AccessToken struct {
	ID      string         `gorm:"primary_key,type:varchar(36)" json:"id"`
	UserId  string         `gorm:"index,type:varchar(200)" json:"userId"`
	Token   string         `gorm:"index,type:varchar(128)" json:"token"`
	Created utils.JsonTime `json:"created"`
}

func (r *AccessToken) TableName() string {
	return "access_token"
}
