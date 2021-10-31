package model

import (
	"next-terminal/server/utils"
)

type Credential struct {
	ID         string         `gorm:"primary_key,type:varchar(36)" json:"id"`
	Name       string         `gorm:"type:varchar(500)" json:"name"`
	Type       string         `gorm:"type:varchar(50)" json:"type"`
	Username   string         `gorm:"type:varchar(200)" json:"username"`
	Password   string         `gorm:"type:varchar(500)" json:"password"`
	PrivateKey string         `gorm:"type:text" json:"privateKey"`
	Passphrase string         `gorm:"type:varchar(500)" json:"passphrase"`
	Created    utils.JsonTime `json:"created"`
	Owner      string         `gorm:"index,type:varchar(36)" json:"owner"`
	Encrypted  bool           `json:"encrypted"`
}

func (r *Credential) TableName() string {
	return "credentials"
}

type CredentialForPage struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Type        string         `json:"type"`
	Username    string         `json:"username"`
	Created     utils.JsonTime `json:"created"`
	Owner       string         `json:"owner"`
	OwnerName   string         `json:"ownerName"`
	SharerCount int64          `json:"sharerCount"`
}

type CredentialSimpleVo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}
