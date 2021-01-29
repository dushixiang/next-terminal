package model

import (
	"next-terminal/pkg/global"
	"next-terminal/pkg/utils"
	"reflect"
)

const (
	TypeUser  = "user"
	TypeAdmin = "admin"
)

type User struct {
	ID         string         `gorm:"primary_key" json:"id"`
	Username   string         `gorm:"uniqueIndex" json:"username"`
	Password   string         `json:"password"`
	Nickname   string         `json:"nickname"`
	TOTPSecret string         `json:"-"`
	Online     bool           `json:"online"`
	Enabled    bool           `json:"enabled"`
	Created    utils.JsonTime `json:"created"`
	Type       string         `json:"type"`
}

type UserVo struct {
	ID               string         `json:"id"`
	Username         string         `json:"username"`
	Nickname         string         `json:"nickname"`
	Online           bool           `json:"online"`
	Enabled          bool           `json:"enabled"`
	Created          utils.JsonTime `json:"created"`
	Type             string         `json:"type"`
	SharerAssetCount int64          `json:"sharerAssetCount"`
}

func (r *User) TableName() string {
	return "users"
}

func (r *User) IsEmpty() bool {
	return reflect.DeepEqual(r, User{})
}

func FindAllUser() (o []User) {
	if global.DB.Find(&o).Error != nil {
		return nil
	}
	return
}

func FindPageUser(pageIndex, pageSize int, username, nickname string) (o []UserVo, total int64, err error) {
	db := global.DB.Table("users").Select("users.id,users.username,users.nickname,users.online,users.enabled,users.created,users.type, count(resource_sharers.user_id) as sharer_asset_count").Joins("left join resource_sharers on users.id = resource_sharers.user_id and resource_sharers.resource_type = 'asset'").Group("users.id")
	dbCounter := global.DB.Table("users")
	if len(username) > 0 {
		db = db.Where("users.username like ?", "%"+username+"%")
		dbCounter = dbCounter.Where("username like ?", "%"+username+"%")
	}

	if len(nickname) > 0 {
		db = db.Where("users.nickname like ?", "%"+nickname+"%")
		dbCounter = dbCounter.Where("nickname like ?", "%"+nickname+"%")
	}

	err = dbCounter.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	err = db.Order("users.created desc").Find(&o).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Error
	if o == nil {
		o = make([]UserVo, 0)
	}
	return
}

func CreateNewUser(o *User) (err error) {
	err = global.DB.Create(o).Error
	return
}

func FindUserById(id string) (o User, err error) {
	err = global.DB.Where("id = ?", id).First(&o).Error
	return
}

func FindUserByIdIn(ids []string) (o []User, err error) {
	err = global.DB.Where("id in ?", ids).First(&o).Error
	return
}

func FindUserByUsername(username string) (o User, err error) {
	err = global.DB.Where("username = ?", username).First(&o).Error
	return
}

func UpdateUserById(o *User, id string) {
	o.ID = id
	global.DB.Updates(o)
}

func DeleteUserById(id string) {
	global.DB.Where("id = ?", id).Delete(&User{})
	// 删除用户组中的用户关系
	global.DB.Where("user_id = ?", id).Delete(&UserGroupMember{})
	// 删除用户分享到的资产
	global.DB.Where("user_id = ?", id).Delete(&ResourceSharer{})
}

func CountUser() (total int64, err error) {
	err = global.DB.Find(&User{}).Count(&total).Error
	return
}
