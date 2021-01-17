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
	ID          string         `gorm:"primary_key" json:"id"`
	Name        string         `json:"name"`
	Created     utils.JsonTime `json:"created"`
	MemberCount int64          `json:"memberCount"`
}

func (r *UserGroup) TableName() string {
	return "user_groups"
}

func FindPageUserGroup(pageIndex, pageSize int, name string) (o []UserGroupVo, total int64, err error) {
	db := global.DB.Table("user_groups").Select("user_groups.id, user_groups.name, user_groups.created, count(user_group_members.user_id) as member_count").Joins("left join user_group_members on user_groups.id = user_group_members.user_group_id").Group("user_groups.id")
	dbCounter := global.DB.Table("user_groups")
	if len(name) > 0 {
		db = db.Where("user_groups.name like ?", "%"+name+"%")
		dbCounter = dbCounter.Where("name like ?", "%"+name+"%")
	}

	err = dbCounter.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	err = db.Order("user_groups.created desc").Find(&o).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Error
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
