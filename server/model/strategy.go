package model

import (
	"next-terminal/server/common"
)

type Strategy struct {
	ID        string          `gorm:"primary_key,type:varchar(36)" json:"id"`
	Name      string          `gorm:"type:varchar(500)" json:"name"`
	Upload    *bool           `gorm:"type:tinyint;default:false" json:"upload"` // 1 = true, 0 = false
	Download  *bool           `gorm:"type:tinyint;default:false" json:"download"`
	Delete    *bool           `gorm:"type:tinyint;default:false" json:"delete"`
	Rename    *bool           `gorm:"type:tinyint;default:false" json:"rename"`
	Edit      *bool           `gorm:"type:tinyint;default:false" json:"edit"`
	CreateDir *bool           `gorm:"type:tinyint;default:false" json:"createDir"`
	Copy      *bool           `gorm:"type:tinyint;default:false" json:"copy"`
	Paste     *bool           `gorm:"type:tinyint;default:false" json:"paste"`
	Created   common.JsonTime `json:"created"`
}

func (r *Strategy) TableName() string {
	return "strategies"
}
