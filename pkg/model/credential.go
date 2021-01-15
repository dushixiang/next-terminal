package model

import (
	"next-terminal/pkg/global"
	"next-terminal/pkg/utils"
)

// 密码
const Custom = "custom"

// 密钥
const PrivateKey = "private-key"

type Credential struct {
	ID         string         `gorm:"primary_key" json:"id"`
	Name       string         `json:"name"`
	Type       string         `json:"type"`
	Username   string         `json:"username"`
	Password   string         `json:"password"`
	PrivateKey string         `json:"privateKey"`
	Passphrase string         `json:"passphrase"`
	Created    utils.JsonTime `json:"created"`
	Owner      string         `json:"owner"`
}

func (r *Credential) TableName() string {
	return "credentials"
}

type CredentialVo struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Type        string         `json:"type"`
	Username    string         `json:"username"`
	Created     utils.JsonTime `json:"created"`
	Owner       string         `json:"owner"`
	OwnerName   string         `json:"ownerName"`
	SharerCount int64          `json:"sharerCount"`
}

func FindAllCredential() (o []Credential, err error) {
	err = global.DB.Find(&o).Error
	return
}

func FindPageCredential(pageIndex, pageSize int, name, owner string) (o []CredentialVo, total int64, err error) {
	db := global.DB.Table("credentials").Select("credentials.id,credentials.name,credentials.type,credentials.username,credentials.owner,credentials.created,users.nickname as owner_name,COUNT(resources.user_id) as sharer_count").Joins("left join users on credentials.owner = users.id").Joins("left join resources on credentials.id = resources.resource_id").Group("credentials.id")
	dbCounter := global.DB.Table("credentials").Select("DISTINCT credentials.id,credentials.name,credentials.type,credentials.username,credentials.owner,credentials.created,users.nickname as owner_name").Joins("left join users on credentials.owner = users.id").Joins("left join resources on credentials.id = resources.resource_id")

	if len(owner) > 0 {
		db = db.Where("credentials.owner = ? or resources.user_id = ?", owner, owner)
		dbCounter = dbCounter.Where("credentials.owner = ? or resources.user_id = ?", owner, owner)
	}

	if len(name) > 0 {
		db = db.Where("credentials.name like ?", "%"+name+"%")
		dbCounter = dbCounter.Where("credentials.name like ?", "%"+name+"%")
	}

	err = dbCounter.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	err = db.Order("credentials.created desc").Offset((pageIndex - 1) * pageSize).Limit(pageSize).Find(&o).Error
	if o == nil {
		o = make([]CredentialVo, 0)
	}
	return
}

func CreateNewCredential(o *Credential) (err error) {
	if err = global.DB.Create(o).Error; err != nil {
		return err
	}
	return nil
}

func FindCredentialById(id string) (o Credential, err error) {
	err = global.DB.Where("id = ?", id).First(&o).Error
	return
}

func UpdateCredentialById(o *Credential, id string) {
	o.ID = id
	global.DB.Updates(o)
}

func DeleteCredentialById(id string) {
	global.DB.Where("id = ?", id).Delete(&Credential{})
}

func CountCredential() (total int64, err error) {
	err = global.DB.Find(&Credential{}).Count(&total).Error
	return
}
