package model

import (
	"gorm.io/gorm"
	"next-terminal/pkg/global"
	"next-terminal/pkg/utils"
)

type UserGroup struct {
	ID      string         `gorm:"primary_key" json:"id"`
	Name    string         `json:"name"`
	Created utils.JsonTime `json:"created"`
}

type UserGroupVo struct {
	ID         string         `json:"id"`
	Name       string         `json:"name"`
	Created    utils.JsonTime `json:"created"`
	AssetCount int64          `json:"assetCount"`
}

func (r *UserGroup) TableName() string {
	return "user_groups"
}

func FindPageUserGroup(pageIndex, pageSize int, name, order, field string) (o []UserGroupVo, total int64, err error) {
	db := global.DB.Table("user_groups").Select("user_groups.id, user_groups.name, user_groups.created, count(resource_sharers.user_group_id) as asset_count").Joins("left join resource_sharers on user_groups.id = resource_sharers.user_group_id and resource_sharers.resource_type = 'asset'").Group("user_groups.id")
	dbCounter := global.DB.Table("user_groups")
	if len(name) > 0 {
		db = db.Where("user_groups.name like ?", "%"+name+"%")
		dbCounter = dbCounter.Where("name like ?", "%"+name+"%")
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

	err = db.Order("user_groups." + field + " " + order).Find(&o).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Error
	if o == nil {
		o = make([]UserGroupVo, 0)
	}
	return
}

func CreateNewUserGroup(o *UserGroup, members []string) (err error) {
	return global.DB.Transaction(func(tx *gorm.DB) error {
		err = tx.Create(o).Error
		if err != nil {
			return err
		}

		if members != nil {
			userGroupId := o.ID
			err = AddUserGroupMembers(tx, members, userGroupId)
			if err != nil {
				return err
			}
		}
		return err
	})
}

func AddUserGroupMembers(tx *gorm.DB, userIds []string, userGroupId string) error {
	for i := range userIds {
		userId := userIds[i]
		_, err := FindUserById(userId)
		if err != nil {
			return err
		}

		userGroupMember := UserGroupMember{
			ID:          utils.Sign([]string{userGroupId, userId}),
			UserId:      userId,
			UserGroupId: userGroupId,
		}
		err = tx.Create(&userGroupMember).Error
		if err != nil {
			return err
		}
	}
	return nil
}

func FindUserGroupById(id string) (o UserGroup, err error) {
	err = global.DB.Where("id = ?", id).First(&o).Error
	return
}

func FindUserGroupIdsByUserId(userId string) (o []string, err error) {
	// 先查询用户所在的用户
	err = global.DB.Table("user_group_members").Select("user_group_id").Where("user_id = ?", userId).Find(&o).Error
	return
}

func UpdateUserGroupById(o *UserGroup, members []string, id string) error {
	return global.DB.Transaction(func(tx *gorm.DB) error {
		o.ID = id
		err := tx.Updates(o).Error
		if err != nil {
			return err
		}

		err = tx.Where("user_group_id = ?", id).Delete(&UserGroupMember{}).Error
		if err != nil {
			return err
		}
		if members != nil {
			userGroupId := o.ID
			err = AddUserGroupMembers(tx, members, userGroupId)
			if err != nil {
				return err
			}
		}
		return err
	})

}

func DeleteUserGroupById(id string) {
	global.DB.Where("id = ?", id).Delete(&UserGroup{})
	global.DB.Where("user_group_id = ?", id).Delete(&UserGroupMember{})
}
