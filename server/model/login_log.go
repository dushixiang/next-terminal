package model

import (
	"next-terminal/server/utils"
)

type LoginLog struct {
	ID              string         `gorm:"primary_key,type:varchar(36)" json:"id"`
	Username        string         `gorm:"index,type:varchar(200)" json:"username"`
	ClientIP        string         `gorm:"type:varchar(200)" json:"clientIp"`
	ClientUserAgent string         `gorm:"type:varchar(500)" json:"clientUserAgent"`
	LoginTime       utils.JsonTime `json:"loginTime"`
	LogoutTime      utils.JsonTime `json:"logoutTime"`
	Remember        bool           `json:"remember"`
	State           string         `gorm:"type:varchar(1)" json:"state"` // 成功 1 失败 0
	Reason          string         `gorm:"type:varchar(500)" json:"reason"`
}

func (r *LoginLog) TableName() string {
	return "login_logs"
}
