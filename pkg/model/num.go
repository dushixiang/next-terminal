package model

import (
	"next-terminal/pkg/global"
)

type Num struct {
	I string `gorm:"primary_key" json:"i"`
}

func (r *Num) TableName() string {
	return "nums"
}

func FindAllTemp() (o []Num) {
	if global.DB.Find(&o).Error != nil {
		return nil
	}
	return
}

func CreateNewTemp(o *Num) (err error) {
	err = global.DB.Create(o).Error
	return
}
