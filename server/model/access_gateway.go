package model

import "next-terminal/server/utils"

// AccessGateway 接入网关
type AccessGateway struct {
	ID          string         `gorm:"primary_key,type:varchar(36)" json:"id"`
	Name        string         `gorm:"type:varchar(500)" json:"name"`
	IP          string         `gorm:"type:varchar(500)" json:"ip"`
	Port        int            `gorm:"type:int(5)" json:"port"`
	AccountType string         `gorm:"type:varchar(50)" json:"accountType"`
	Username    string         `gorm:"type:varchar(200)" json:"username"`
	Password    string         `gorm:"type:varchar(500)" json:"password"`
	PrivateKey  string         `gorm:"type:text" json:"privateKey"`
	Passphrase  string         `gorm:"type:varchar(500)" json:"passphrase"`
	Created     utils.JsonTime `json:"created"`
}

func (r *AccessGateway) TableName() string {
	return "access_gateways"
}

type AccessGatewayForPage struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	IP          string         `json:"ip"`
	Port        int            `json:"port"`
	AccountType string         `json:"accountType"`
	Username    string         `json:"username"`
	Created     utils.JsonTime `json:"created"`
	Connected   bool           `json:"connected"`
	Message     string         `json:"message"`
}
