package model

import (
	"next-terminal/server/common"
)

type AssetProto string

type Asset struct {
	ID              string          `gorm:"primary_key,type:varchar(36)" json:"id"`
	Name            string          `gorm:"type:varchar(500)" json:"name"`
	Protocol        string          `gorm:"type:varchar(20)" json:"protocol"`
	IP              string          `gorm:"type:varchar(200)" json:"ip"`
	Port            int             `json:"port"`
	AccountType     string          `gorm:"type:varchar(20)" json:"accountType"`
	Username        string          `gorm:"type:varchar(200)" json:"username"`
	Password        string          `gorm:"type:varchar(500)" json:"password"`
	CredentialId    string          `gorm:"index,type:varchar(36)" json:"credentialId"`
	PrivateKey      string          `gorm:"type:text" json:"privateKey"`
	Passphrase      string          `gorm:"type:varchar(500)" json:"passphrase"`
	Description     string          `json:"description"`
	Active          bool            `json:"active"`
	ActiveMessage   string          `gorm:"type:varchar(200)" json:"activeMessage"`
	Created         common.JsonTime `json:"created"`
	LastAccessTime  common.JsonTime `json:"lastAccessTime"`
	Tags            string          `json:"tags"`
	Owner           string          `gorm:"index,type:varchar(36)" json:"owner"`
	Encrypted       bool            `json:"encrypted"`
	AccessGatewayId string          `gorm:"type:varchar(36)" json:"accessGatewayId"`
}

type AssetForPage struct {
	ID             string          `json:"id"`
	Name           string          `json:"name"`
	Description    string          `json:"description"`
	IP             string          `json:"ip"`
	Protocol       string          `json:"protocol"`
	Port           int             `json:"port"`
	Active         bool            `json:"active"`
	ActiveMessage  string          `json:"activeMessage"`
	Created        common.JsonTime `json:"created"`
	LastAccessTime common.JsonTime `json:"lastAccessTime"`
	Tags           string          `json:"tags"`
	Owner          string          `json:"owner"`
	OwnerName      string          `json:"ownerName"`
}

func (r *Asset) TableName() string {
	return "assets"
}

type AssetAttribute struct {
	Id      string `gorm:"index" json:"id"`
	AssetId string `gorm:"index" json:"assetId"`
	Name    string `gorm:"index" json:"name"`
	Value   string `json:"value"`
}

func (r *AssetAttribute) TableName() string {
	return "asset_attributes"
}
