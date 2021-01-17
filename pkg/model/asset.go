package model

import (
	"next-terminal/pkg/global"
	"next-terminal/pkg/utils"
	"strings"
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
	Tags         string         `json:"tags"`
	Owner        string         `json:"owner"`
}

type AssetVo struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	IP          string         `json:"ip"`
	Protocol    string         `json:"protocol"`
	Port        int            `json:"port"`
	Active      bool           `json:"active"`
	Created     utils.JsonTime `json:"created"`
	Tags        string         `json:"tags"`
	Owner       string         `json:"owner"`
	OwnerName   string         `json:"ownerName"`
	SharerCount int64          `json:"sharerCount"`
}

func (r *Asset) TableName() string {
	return "assets"
}

func FindAssetByConditions(protocol string, account User) (o []Asset, err error) {
	db := global.DB.Table("assets").Select("assets.id,assets.name,assets.ip,assets.port,assets.protocol,assets.active,assets.owner,assets.created, users.nickname as owner_name,COUNT(resources.user_id) as sharer_count").Joins("left join users on assets.owner = users.id").Joins("left join resources on assets.id = resources.resource_id").Group("assets.id")

	if TypeUser == account.Type {
		owner := account.ID
		db = db.Where("assets.owner = ? or resources.user_id = ?", owner, owner)
	}

	if len(protocol) > 0 {
		db = db.Where("assets.protocol = ?", protocol)
	}
	err = db.Find(&o).Error
	return
}

func FindPageAsset(pageIndex, pageSize int, name, protocol, tags string, account User, owner, sharer string) (o []AssetVo, total int64, err error) {
	db := global.DB.Table("assets").Select("assets.id,assets.name,assets.ip,assets.port,assets.protocol,assets.active,assets.owner,assets.created, users.nickname as owner_name,COUNT(resources.user_id) as sharer_count").Joins("left join users on assets.owner = users.id").Joins("left join resources on assets.id = resources.resource_id").Group("assets.id")
	dbCounter := global.DB.Table("assets").Select("DISTINCT assets.id").Joins("left join resources on assets.id = resources.resource_id")

	if TypeUser == account.Type {
		owner := account.ID
		db = db.Where("assets.owner = ? or resources.user_id = ?", owner, owner)
		dbCounter = dbCounter.Where("assets.owner = ? or resources.user_id = ?", owner, owner)
	} else {
		if len(owner) > 0 {
			db = db.Where("assets.owner = ?", owner)
			dbCounter = dbCounter.Where("assets.owner = ?", owner)
		}
		if len(sharer) > 0 {
			db = db.Where("resources.user_id = ?", sharer)
			dbCounter = dbCounter.Where("resources.user_id = ?", sharer)
		}
	}

	if len(name) > 0 {
		db = db.Where("assets.name like ?", "%"+name+"%")
		dbCounter = dbCounter.Where("assets.name like ?", "%"+name+"%")
	}

	if len(protocol) > 0 {
		db = db.Where("assets.protocol = ?", protocol)
		dbCounter = dbCounter.Where("assets.protocol = ?", protocol)
	}

	if len(tags) > 0 {
		tagArr := strings.Split(tags, ",")
		for i := range tagArr {
			db = db.Where("find_in_set(?, assets.tags)", tagArr[i])
			dbCounter = dbCounter.Where("find_in_set(?, assets.tags)", tagArr[i])
		}
	}

	err = dbCounter.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	err = db.Order("assets.created desc").Offset((pageIndex - 1) * pageSize).Limit(pageSize).Find(&o).Error

	if o == nil {
		o = make([]AssetVo, 0)
	}
	return
}

func CreateNewAsset(o *Asset) (err error) {
	if err = global.DB.Create(o).Error; err != nil {
		return err
	}
	return nil
}

func FindAssetById(id string) (o Asset, err error) {
	err = global.DB.Where("id = ?", id).First(&o).Error
	return
}

func UpdateAssetById(o *Asset, id string) {
	o.ID = id
	global.DB.Updates(o)
}

func UpdateAssetActiveById(active bool, id string) {
	sql := "update assets set active = ? where id = ?"
	global.DB.Exec(sql, active, id)
}

func DeleteAssetById(id string) {
	global.DB.Where("id = ?", id).Delete(&Asset{})
}

func CountAsset() (total int64, err error) {
	err = global.DB.Find(&Asset{}).Count(&total).Error
	return
}

func FindAssetTags() (o []string, err error) {
	var assets []Asset
	err = global.DB.Not("tags = ?", "").Find(&assets).Error
	if err != nil {
		return nil, err
	}

	o = make([]string, 0)

	for i := range assets {
		if len(assets[i].Tags) == 0 {
			continue
		}
		split := strings.Split(assets[i].Tags, ",")

		o = append(o, split...)
	}

	return utils.Distinct(o), nil
}
