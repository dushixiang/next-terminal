package model

import (
	"next-terminal/server/common"
)

type ShareSession struct {
	ID         string          `gorm:"primary_key,type:varchar(130)" json:"id"`
	AssetId    string          `gorm:"index,type:varchar(36)" json:"assetId"`
	FileSystem string          `gorm:"type:varchar(1)" json:"fileSystem"` // 1 = true, 0 = false
	Upload     string          `gorm:"type:varchar(1)" json:"upload"`
	Download   string          `gorm:"type:varchar(1)" json:"download"`
	Delete     string          `gorm:"type:varchar(1)" json:"delete"`
	Rename     string          `gorm:"type:varchar(1)" json:"rename"`
	Edit       string          `gorm:"type:varchar(1)" json:"edit"`
	CreateDir  string          `gorm:"type:varchar(1)" json:"createDir"`
	Mode       string          `gorm:"type:varchar(20)" json:"mode"`
	Creator    string          `gorm:"type:varchar(36)" json:"creator"`
	Created    common.JsonTime `json:"created"`    // 创建时间
	Expiration common.JsonTime `json:"expiration"` // 过期时间
}
