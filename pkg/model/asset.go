package model

import (
	"next-terminal/pkg/config"
	"next-terminal/pkg/utils"
)

type Asset struct {
	ID           string         `gorm:"primary_key " json:"id"`
	Name         string         `json:"name"`
	IP           string         `json:"ip"`
	Protocol     string         `json:"protocol"`
	Port         int            `json:"port"`
	AccountType  string         `json:"accountType"`
	Username     string         `json:"username"`
	Password     string         `json:"password"`
	CredentialId string         `json:"credentialId"`
	PrivateKey   string         `json:"privateKey"`
	Passphrase   string         `json:"passphrase"`
	Description  string         `json:"description"`
	Active       bool           `json:"active"`
	Created      utils.JsonTime `json:"created"`
}

func (r *Asset) TableName() string {
	return "assets"
}

func FindAllAsset() (o []Asset, err error) {
	err = config.DB.Find(&o).Error
	return
}

func FindAssetByConditions(protocol string) (o []Asset, err error) {
	db := config.DB

	if len(protocol) > 0 {
		db = db.Where("protocol = ?", protocol)
	}
	err = db.Find(&o).Error
	return
}

func FindPageAsset(pageIndex, pageSize int, name, protocol string) (o []Asset, total int64, err error) {
	db := config.DB
	if len(name) > 0 {
		db = db.Where("name like ?", "%"+name+"%")
	}

	if len(protocol) > 0 {
		db = db.Where("protocol = ?", protocol)
	}

	err = db.Order("created desc").Find(&o).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Count(&total).Error

	if o == nil {
		o = make([]Asset, 0)
	}
	return
}

func CreateNewAsset(o *Asset) (err error) {
	if err = config.DB.Create(o).Error; err != nil {
		return err
	}
	return nil
}

func FindAssetById(id string) (o Asset, err error) {
	err = config.DB.Where("id = ?", id).First(&o).Error
	return
}

func UpdateAssetById(o *Asset, id string) {
	o.ID = id
	config.DB.Updates(o)
}

func DeleteAssetById(id string) {
	config.DB.Where("id = ?", id).Delete(&Asset{})
}

func CountAsset() (total int64, err error) {
	err = config.DB.Find(&Asset{}).Count(&total).Error
	return
}
