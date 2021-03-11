package model

import (
	"next-terminal/pkg/constant"
	"next-terminal/pkg/global"
	"next-terminal/pkg/utils"
)

type Credential struct {
	ID         string         `gorm:"primary_key" json:"id"`
	Name       string         `json:"name"`
	Type       string         `json:"type"`
	Username   string         `json:"username"`
	Password   string         `json:"password"`
	PrivateKey string         `json:"privateKey"`
	Passphrase string         `json:"passphrase"`
	Created    utils.JsonTime `json:"created"`
	Owner      string         `gorm:"index" json:"owner"`
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

type CredentialSimpleVo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func FindAllCredential(account User) (o []CredentialSimpleVo, err error) {
	db := global.DB.Table("credentials").Select("DISTINCT credentials.id,credentials.name").Joins("left join resource_sharers on credentials.id = resource_sharers.resource_id")
	if account.Type == constant.TypeUser {
		db = db.Where("credentials.owner = ? or resource_sharers.user_id = ?", account.ID, account.ID)
	}
	err = db.Find(&o).Error
	return
}

func FindPageCredential(pageIndex, pageSize int, name, order, field string, account User) (o []CredentialVo, total int64, err error) {
	db := global.DB.Table("credentials").Select("credentials.id,credentials.name,credentials.type,credentials.username,credentials.owner,credentials.created,users.nickname as owner_name,COUNT(resource_sharers.user_id) as sharer_count").Joins("left join users on credentials.owner = users.id").Joins("left join resource_sharers on credentials.id = resource_sharers.resource_id").Group("credentials.id")
	dbCounter := global.DB.Table("credentials").Select("DISTINCT credentials.id").Joins("left join resource_sharers on credentials.id = resource_sharers.resource_id").Group("credentials.id")

	if constant.TypeUser == account.Type {
		owner := account.ID
		db = db.Where("credentials.owner = ? or resource_sharers.user_id = ?", owner, owner)
		dbCounter = dbCounter.Where("credentials.owner = ? or resource_sharers.user_id = ?", owner, owner)
	}

	if len(name) > 0 {
		db = db.Where("credentials.name like ?", "%"+name+"%")
		dbCounter = dbCounter.Where("credentials.name like ?", "%"+name+"%")
	}

	err = dbCounter.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	if order == "ascend" {
		order = "asc"
	} else {
		order = "desc"
	}

	if field == "name" {
		field = "name"
	} else {
		field = "created"
	}

	err = db.Order("credentials." + field + " " + order).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Find(&o).Error
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

func DeleteCredentialById(id string) error {
	return global.DB.Where("id = ?", id).Delete(&Credential{}).Error
}

func CountCredential() (total int64, err error) {
	err = global.DB.Find(&Credential{}).Count(&total).Error
	return
}

func CountCredentialByUserId(userId string) (total int64, err error) {
	db := global.DB.Joins("left join resource_sharers on credentials.id = resource_sharers.resource_id")

	db = db.Where("credentials.owner = ? or resource_sharers.user_id = ?", userId, userId)

	// 查询用户所在用户组列表
	userGroupIds, err := FindUserGroupIdsByUserId(userId)
	if err != nil {
		return 0, err
	}

	if userGroupIds != nil && len(userGroupIds) > 0 {
		db = db.Or("resource_sharers.user_group_id in ?", userGroupIds)
	}
	err = db.Find(&Credential{}).Count(&total).Error
	return
}
