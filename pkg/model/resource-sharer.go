package model

import (
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
	"next-terminal/pkg/global"
	"next-terminal/pkg/utils"
)

type ResourceSharer struct {
	ID           string `gorm:"primary_key" json:"id"`
	ResourceId   string `gorm:"index" json:"resourceId"`
	ResourceType string `gorm:"index" json:"resourceType"`
	UserId       string `gorm:"index" json:"userId"`
	UserGroupId  string `gorm:"index" json:"userGroupId"`
}

func (r *ResourceSharer) TableName() string {
	return "resource_sharers"
}

func FindUserIdsByResourceId(resourceId string) (r []string, err error) {
	db := global.DB
	err = db.Table("resource_sharers").Select("user_id").Where("resource_id = ?", resourceId).Find(&r).Error
	if r == nil {
		r = make([]string, 0)
	}
	return
}

func OverwriteUserIdsByResourceId(resourceId, resourceType string, userIds []string) (err error) {
	db := global.DB.Begin()

	var owner string
	// 检查资产是否存在
	switch resourceType {
	case "asset":
		resource := Asset{}
		err = db.Where("id = ?", resourceId).First(&resource).Error
		owner = resource.Owner
	case "command":
		resource := Command{}
		err = db.Where("id = ?", resourceId).First(&resource).Error
		owner = resource.Owner
	case "credential":
		resource := Credential{}
		err = db.Where("id = ?", resourceId).First(&resource).Error
		owner = resource.Owner
	}

	if err == gorm.ErrRecordNotFound {
		return echo.NewHTTPError(404, "资源「"+resourceId+"」不存在")
	}

	for i := range userIds {
		if owner == userIds[i] {
			return echo.NewHTTPError(400, "参数错误")
		}
	}

	db.Where("resource_id = ?", resourceId).Delete(&ResourceSharer{})

	for i := range userIds {
		userId := userIds[i]
		if len(userId) == 0 {
			continue
		}
		id := utils.Sign([]string{resourceId, resourceType, userId})
		resource := &ResourceSharer{
			ID:           id,
			ResourceId:   resourceId,
			ResourceType: resourceType,
			UserId:       userId,
		}
		err = db.Create(resource).Error
		if err != nil {
			return err
		}
	}
	db.Commit()
	return nil
}

func DeleteByUserIdAndResourceTypeAndResourceIdIn(userGroupId, userId, resourceType string, resourceIds []string) error {
	db := global.DB
	if userGroupId != "" {
		db = db.Where("user_group_id = ?", userGroupId)
	}

	if userId != "" {
		db = db.Where("user_id = ?", userId)
	}

	if resourceType != "" {
		db = db.Where("resource_type = ?", resourceType)
	}

	if resourceIds != nil {
		db = db.Where("resource_id in ?", resourceIds)
	}

	return db.Delete(&ResourceSharer{}).Error
}

func AddSharerResources(userGroupId, userId, resourceType string, resourceIds []string) error {
	return global.DB.Transaction(func(tx *gorm.DB) (err error) {

		for i := range resourceIds {
			resourceId := resourceIds[i]

			var owner string
			// 检查资产是否存在
			switch resourceType {
			case "asset":
				resource := Asset{}
				err = tx.Where("id = ?", resourceId).First(&resource).Error
				owner = resource.Owner
			case "command":
				resource := Command{}
				err = tx.Where("id = ?", resourceId).First(&resource).Error
				owner = resource.Owner
			case "credential":
				resource := Credential{}
				err = tx.Where("id = ?", resourceId).First(&resource).Error
				owner = resource.Owner
			}

			if owner == userId {
				return echo.NewHTTPError(400, "参数错误")
			}

			id := utils.Sign([]string{resourceId, resourceType, userId, userGroupId})
			resource := &ResourceSharer{
				ID:           id,
				ResourceId:   resourceId,
				ResourceType: resourceType,
				UserId:       userId,
				UserGroupId:  userGroupId,
			}
			err = tx.Create(resource).Error
			if err != nil {
				return err
			}
		}
		return nil
	})
}

func FindAssetIdsByUserId(userId string) (assetIds []string, err error) {
	groupIds, err := FindUserGroupIdsByUserId(userId)
	if err != nil {
		return nil, err
	}

	db := global.DB
	db = db.Table("resource_sharers").Select("resource_id").Where("user_id = ?", userId)
	if groupIds != nil && len(groupIds) > 0 {
		db = db.Or("user_group_id in ?", groupIds)
	}
	err = db.Find(&assetIds).Error
	if assetIds == nil {
		assetIds = make([]string, 0)
	}
	return
}
