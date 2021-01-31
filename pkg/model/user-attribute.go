package model

import "next-terminal/pkg/global"

const (
	FontSize = "font-size"
)

type UserAttribute struct {
	Id     string `gorm:"index" json:"id"`
	UserId string `gorm:"index" json:"userId"`
	Name   string `gorm:"index" json:"name"`
	Value  string `json:"value"`
}

func (r *UserAttribute) TableName() string {
	return "user_attributes"
}

func CreateUserAttribute(o *UserAttribute) error {
	return global.DB.Create(o).Error
}

func FindUserAttributeByUserId(userId string) (o []UserAttribute, err error) {
	err = global.DB.Where("user_id = ?", userId).Find(&o).Error
	return o, err
}
