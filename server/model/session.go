package model

import (
	"next-terminal/server/utils"
)

type Session struct {
	ID               string         `gorm:"primary_key,type:varchar(36)" json:"id"`
	Protocol         string         `gorm:"type:varchar(20)" json:"protocol"`
	IP               string         `gorm:"type:varchar(200)" json:"ip"`
	Port             int            `json:"port"`
	ConnectionId     string         `gorm:"type:varchar(50)" json:"connectionId"`
	AssetId          string         `gorm:"index,type:varchar(36)" json:"assetId"`
	Username         string         `gorm:"type:varchar(200)" json:"username"`
	Password         string         `gorm:"type:varchar(500)" json:"password"`
	Creator          string         `gorm:"index,type:varchar(36)" json:"creator"`
	ClientIP         string         `gorm:"type:varchar(200)" json:"clientIp"`
	Width            int            `json:"width"`
	Height           int            `json:"height"`
	Status           string         `gorm:"index,type:varchar(20)" json:"status"`
	Recording        string         `gorm:"type:varchar(1000)" json:"recording"`
	PrivateKey       string         `gorm:"type:text" json:"privateKey"`
	Passphrase       string         `gorm:"type:varchar(500)" json:"passphrase"`
	Code             int            `json:"code"`
	Message          string         `json:"message"`
	ConnectedTime    utils.JsonTime `json:"connectedTime"`
	DisconnectedTime utils.JsonTime `json:"disconnectedTime"`
	Mode             string         `gorm:"type:varchar(10)" json:"mode"`
	FileSystem       string         `gorm:"type:varchar(1)" json:"fileSystem"` // 1 = true, 0 = false
	Upload           string         `gorm:"type:varchar(1)" json:"upload"`
	Download         string         `gorm:"type:varchar(1)" json:"download"`
	Delete           string         `gorm:"type:varchar(1)" json:"delete"`
	Rename           string         `gorm:"type:varchar(1)" json:"rename"`
	Edit             string         `gorm:"type:varchar(1)" json:"edit"`
	CreateDir        string         `gorm:"type:varchar(1)" json:"createDir"`
	Copy             string         `gorm:"type:varchar(1)" json:"copy"`
	Paste            string         `gorm:"type:varchar(1)" json:"paste"`
	StorageId        string         `gorm:"type:varchar(36)" json:"storageId"`
	AccessGatewayId  string         `gorm:"type:varchar(36)" json:"accessGatewayId"`
	Reviewed         bool           `gorm:"type:tinyint(1)" json:"reviewed"`
}

func (r *Session) TableName() string {
	return "sessions"
}

type SessionForPage struct {
	ID               string         `json:"id"`
	Protocol         string         `json:"protocol"`
	IP               string         `json:"ip"`
	Port             int            `json:"port"`
	Username         string         `json:"username"`
	ConnectionId     string         `json:"connectionId"`
	AssetId          string         `json:"assetId"`
	Creator          string         `json:"creator"`
	ClientIP         string         `json:"clientIp"`
	Width            int            `json:"width"`
	Height           int            `json:"height"`
	Status           string         `json:"status"`
	Recording        string         `json:"recording"`
	ConnectedTime    utils.JsonTime `json:"connectedTime"`
	DisconnectedTime utils.JsonTime `json:"disconnectedTime"`
	AssetName        string         `json:"assetName"`
	CreatorName      string         `json:"creatorName"`
	Code             int            `json:"code"`
	Message          string         `json:"message"`
	Mode             string         `json:"mode"`
	Reviewed         bool           `json:"reviewed"`
}

type SessionForAccess struct {
	AssetId     string `json:"assetId"`
	Protocol    string `json:"protocol"`
	IP          string `json:"ip"`
	Port        int    `json:"port"`
	Username    string `json:"username"`
	AccessCount int64  `json:"accessCount"`
}
