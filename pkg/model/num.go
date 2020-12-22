package model

import (
	"next-terminal/pkg/config"
)

type Num struct {
	I string `gorm:"primary_key" json:"i"`
}

func (r *Num) TableName() string {
	return "nums"
}

func FindAllTemp() (o []Num) {
	if config.DB.Find(&o).Error != nil {
		return nil
	}
	return
}

func CreateNewTemp(o *Num) (err error) {
	err = config.DB.Create(o).Error
	return
}
