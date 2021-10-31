package model

import "next-terminal/server/utils"

type Strategy struct {
	ID        string         `gorm:"primary_key,type:varchar(36)" json:"id"`
	Name      string         `gorm:"type:varchar(500)" json:"name"`
	Upload    string         `gorm:"type:varchar(1)" json:"upload"` // 1 = true, 0 = false
	Download  string         `gorm:"type:varchar(1)" json:"download"`
	Delete    string         `gorm:"type:varchar(1)" json:"delete"`
	Rename    string         `gorm:"type:varchar(1)" json:"rename"`
	Edit      string         `gorm:"type:varchar(1)" json:"edit"`
	CreateDir string         `gorm:"type:varchar(1)" json:"createDir"`
	Created   utils.JsonTime `json:"created"`
}

func (r *Strategy) TableName() string {
	return "strategies"
}
