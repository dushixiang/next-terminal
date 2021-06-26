package model

import (
	"next-terminal/server/utils"
)

type LoginLog struct {
	ID              string         `gorm:"primary_key" json:"id"`
	Username        string         `gorm:"index" json:"username"`
	ClientIP        string         `json:"clientIp"`
	ClientUserAgent string         `json:"clientUserAgent"`
	LoginTime       utils.JsonTime `json:"loginTime"`
	LogoutTime      utils.JsonTime `json:"logoutTime"`
	Remember        bool           `json:"remember"`
	State           string         `json:"state"`
	Reason          string         `json:"reason"`
}

func (r *LoginLog) TableName() string {
	return "login_logs"
}
