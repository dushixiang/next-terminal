package model

import "next-terminal/pkg/global"

type Tag struct {
	Tag string `json:"tag"`
}

func (r *Tag) TableName() string {
	return "tags"
}

func FindAllTag() (o []Property) {
	if global.DB.Find(&o).Error != nil {
		return nil
	}
	return
}

func CreateNewTag(o *Tag) (err error) {
	err = global.DB.Create(o).Error
	return
}
