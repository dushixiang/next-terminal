package model

import (
	"next-terminal/pkg/config"
	"next-terminal/pkg/utils"
)

type Credential struct {
	ID       string         `gorm:"primary_key" json:"id"`
	Name     string         `json:"name"`
	Username string         `json:"username"`
	Password string         `json:"password"`
	Created  utils.JsonTime `json:"created"`
}

func (r *Credential) TableName() string {
	return "credentials"
}

func FindAllCredential() (o []Credential, err error) {
	err = config.DB.Find(&o).Error
	return
}

func FindPageCredential(pageIndex, pageSize int, name string) (o []Credential, total int64, err error) {
	db := config.DB
	if len(name) > 0 {
		db = db.Where("name like ?", "%"+name+"%")
	}

	err = db.Order("created desc").Find(&o).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Count(&total).Error
	if o == nil {
		o = make([]Credential, 0)
	}
	return
}

func CreateNewCredential(o *Credential) (err error) {
	if err = config.DB.Create(o).Error; err != nil {
		return err
	}
	return nil
}

func FindCredentialById(id string) (o Credential, err error) {

	err = config.DB.Where("id = ?", id).First(&o).Error
	return
}

func UpdateCredentialById(o *Credential, id string) {
	o.ID = id
	config.DB.Updates(o)
}

func DeleteCredentialById(id string) {
	config.DB.Where("id = ?", id).Delete(&Credential{})
}

func CountCredential() (total int64, err error) {
	err = config.DB.Find(&Credential{}).Count(&total).Error
	return
}
