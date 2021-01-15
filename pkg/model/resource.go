package model

import (
	"next-terminal/pkg/global"
	"next-terminal/pkg/utils"
)

type Resource struct {
	ID         string `gorm:"primary_key" json:"name"`
	ResourceId string `json:"resourceId"`
	UserId     string `json:"userId"`
}

func (r *Resource) TableName() string {
	return "resources"
}

func FindUserIdsByResourceId(resourceId string) (r []string, err error) {
	db := global.DB
	err = db.Table("resources").Select("user_id").Where("resource_id = ?", resourceId).Find(&r).Error
	if r == nil {
		r = make([]string, 0)
	}
	return
}

func OverwriteUserIdsByResourceId(resourceId string, userIds []string) {
	db := global.DB.Begin()
	db.Where("resource_id = ?", resourceId).Delete(&Resource{})

	for i := range userIds {
		userId := userIds[i]
		if len(userId) == 0 {
			continue
		}
		id := utils.Sign([]string{resourceId, userId})
		resource := &Resource{
			ID:         id,
			ResourceId: resourceId,
			UserId:     userId,
		}
		_ = db.Create(resource).Error
	}
	db.Commit()
}
