package model

import (
	"next-terminal/server/common"
)

type Storage struct {
	ID        string          `gorm:"primary_key,type:varchar(36)" json:"id"`
	Name      string          `gorm:"type:varchar(500)" json:"name"`
	IsShare   bool            `json:"isShare"`   // 是否共享
	LimitSize int64           `json:"limitSize"` // 大小限制，单位字节
	IsDefault bool            `json:"isDefault"` // 是否为用户默认的
	Owner     string          `gorm:"index,type:varchar(36)" json:"owner"`
	Created   common.JsonTime `json:"created"`
}

func (r *Storage) TableName() string {
	return "storages"
}

type StorageForPage struct {
	ID        string          `gorm:"primary_key " json:"id"`
	Name      string          `json:"name"`
	IsShare   bool            `json:"isShare"`   // 是否共享
	LimitSize int64           `json:"limitSize"` // 大小限制，单位字节
	UsedSize  int64           `json:"usedSize"`
	IsDefault bool            `json:"isDefault"` // 是否为用户默认的
	Owner     string          `gorm:"index" json:"owner"`
	OwnerName string          `json:"ownerName"`
	Created   common.JsonTime `json:"created"`
}
