package repository

import (
	"gorm.io/gorm"
	"next-terminal/server/model"
	"next-terminal/server/utils"
)

type UserGroupRepository struct {
	DB *gorm.DB
}

func NewUserGroupRepository(db *gorm.DB) *UserGroupRepository {
	userGroupRepository = &UserGroupRepository{DB: db}
	return userGroupRepository
}

func (r UserGroupRepository) FindAll() (o []model.UserGroup) {
	if r.DB.Find(&o).Error != nil {
		return nil
	}
	return
}

func (r UserGroupRepository) Find(pageIndex, pageSize int, name, order, field string) (o []model.UserGroup, total int64, err error) {
	db := r.DB.Table("user_groups").Select("user_groups.id, user_groups.name, user_groups.created, count(resource_sharers.user_group_id) as asset_count").Joins("left join resource_sharers on user_groups.id = resource_sharers.user_group_id and resource_sharers.resource_type = 'asset'").Group("user_groups.id")
	dbCounter := r.DB.Table("user_groups")
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
		o = make([]model.UserGroup, 0)
	}
	return
}

func (r UserGroupRepository) FindById(id string) (o model.UserGroup, err error) {
	err = r.DB.Where("id = ?", id).First(&o).Error
	return
}

func (r UserGroupRepository) FindUserGroupIdsByUserId(userId string) (o []string, err error) {
	// 先查询用户所在的用户
	err = r.DB.Table("user_group_members").Select("user_group_id").Where("user_id = ?", userId).Find(&o).Error
	return
}

func (r UserGroupRepository) FindMembersById(userGroupId string) (o []string, err error) {
	err = r.DB.Table("user_group_members").Select("user_id").Where("user_group_id = ?", userGroupId).Find(&o).Error
	return
}

func (r UserGroupRepository) Create(o *model.UserGroup, members []string) (err error) {
	return r.DB.Transaction(func(tx *gorm.DB) error {
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

func (r UserGroupRepository) Update(o *model.UserGroup, members []string, id string) error {
	return r.DB.Transaction(func(tx *gorm.DB) error {
		o.ID = id
		err := tx.Updates(o).Error
		if err != nil {
			return err
		}

		err = tx.Where("user_group_id = ?", id).Delete(&model.UserGroupMember{}).Error
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

func (r UserGroupRepository) DeleteById(id string) (err error) {
	err = r.DB.Where("id = ?", id).Delete(&model.UserGroup{}).Error
	if err != nil {
		return err
	}
	return r.DB.Where("user_group_id = ?", id).Delete(&model.UserGroupMember{}).Error
}

func AddUserGroupMembers(tx *gorm.DB, userIds []string, userGroupId string) error {
	userRepository := NewUserRepository(tx)
	for i := range userIds {
		userId := userIds[i]
		_, err := userRepository.FindById(userId)
		if err != nil {
			return err
		}

		userGroupMember := model.UserGroupMember{
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
