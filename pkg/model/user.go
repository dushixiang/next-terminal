package model

import (
	"next-terminal/pkg/config"
	"next-terminal/pkg/utils"
	"reflect"
)

type User struct {
	ID       string         `gorm:"primary_key" json:"id"`
	Username string         `json:"username"`
	Password string         `json:"password"`
	Nickname string         `json:"nickname"`
	Online   bool           `json:"online"`
	Enabled  bool           `json:"enabled"`
	Created  utils.JsonTime `json:"created"`
}

func (r *User) TableName() string {
	return "users"
}

func (r *User) IsEmpty() bool {
	return reflect.DeepEqual(r, User{})
}

func FindAllUser() (o []User) {
	if config.DB.Find(&o).Error != nil {
		return nil
	}
	return
}

func FindPageUser(pageIndex, pageSize int, username, nickname string) (o []User, total int64, err error) {

	db := config.DB
	if len(username) > 0 {
		db = db.Where("username like ?", "%"+username+"%")
	}

	if len(nickname) > 0 {
		db = db.Where("nickname like ?", "%"+nickname+"%")
	}

	err = db.Order("created desc").Find(&o).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Count(&total).Error
	if o == nil {
		o = make([]User, 0)
	}
	return
}

func CreateNewUser(o *User) (err error) {
	err = config.DB.Create(o).Error
	return
}

func FindUserById(id string) (o User, err error) {
	err = config.DB.Where("id = ?", id).First(&o).Error
	return
}

func FindUserByUsername(username string) (o User, err error) {
	err = config.DB.Where("username = ?", username).First(&o).Error
	return
}

func UpdateUserById(o *User, id string) {
	o.ID = id
	config.DB.Updates(o)
}

func DeleteUserById(id string) {
	config.DB.Where("id = ?", id).Delete(&User{})
}

func CountUser() (total int64, err error) {
	err = config.DB.Find(&User{}).Count(&total).Error
	return
}
