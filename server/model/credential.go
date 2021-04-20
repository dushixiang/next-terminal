package model

import (
	"next-terminal/server/utils"
)

type Credential struct {
	ID         string         `gorm:"primary_key" json:"id"`
	Name       string         `json:"name"`
	Type       string         `json:"type"`
	Username   string         `json:"username"`
	Password   string         `json:"password"`
	PrivateKey string         `json:"privateKey"`
	Passphrase string         `json:"passphrase"`
	Created    utils.JsonTime `json:"created"`
	Owner      string         `gorm:"index" json:"owner"`
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
