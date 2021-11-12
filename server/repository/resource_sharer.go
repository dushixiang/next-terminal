package repository

import (
	"next-terminal/server/model"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	"gorm.io/gorm"
)

type ResourceSharerRepository struct {
	DB *gorm.DB
}

func NewResourceSharerRepository(db *gorm.DB) *ResourceSharerRepository {
	resourceSharerRepository = &ResourceSharerRepository{DB: db}
	return resourceSharerRepository
}

func (r *ResourceSharerRepository) OverwriteUserIdsByResourceId(resourceId, resourceType string, userIds []string) (err error) {
	db := r.DB.Begin()

	var owner string
	// 检查资产是否存在
	switch resourceType {
	case "asset":
		resource := model.Asset{}
		err = db.Where("id = ?", resourceId).First(&resource).Error
		owner = resource.Owner
	case "command":
		resource := model.Command{}
		err = db.Where("id = ?", resourceId).First(&resource).Error
		owner = resource.Owner
	case "credential":
		resource := model.Credential{}
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

	db.Where("resource_id = ?", resourceId).Delete(&model.ResourceSharer{})

	for i := range userIds {
		userId := userIds[i]
		if len(userId) == 0 {
			continue
		}
		id := utils.Sign([]string{resourceId, resourceType, userId})
		resource := &model.ResourceSharer{
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

func (r *ResourceSharerRepository) DeleteByUserIdAndResourceTypeAndResourceIdIn(userGroupId, userId, resourceType string, resourceIds []string) error {
	db := r.DB
	if userGroupId != "" {
		db = db.Where("user_group_id = ?", userGroupId)
	}

	if userId != "" {
		db = db.Where("user_id = ?", userId)
	}

	if resourceType != "" {
		db = db.Where("resource_type = ?", resourceType)
	}

	if len(resourceIds) > 0 {
		db = db.Where("resource_id in ?", resourceIds)
	}

	return db.Delete(&model.ResourceSharer{}).Error
}

func (r *ResourceSharerRepository) DeleteResourceSharerByResourceId(resourceId string) error {
	return r.DB.Where("resource_id = ?", resourceId).Delete(&model.ResourceSharer{}).Error
}

func (r *ResourceSharerRepository) AddSharerResources(userGroupId, userId, strategyId, resourceType string, resourceIds []string) error {
	return r.DB.Transaction(func(tx *gorm.DB) (err error) {

		for i := range resourceIds {
			resourceId := resourceIds[i]

			var owner string
			// 检查资产是否存在
			switch resourceType {
			case "asset":
				resource := model.Asset{}
				if err = tx.Where("id = ?", resourceId).First(&resource).Error; err != nil {
					return errors.Wrap(err, "find asset  fail")
				}
				owner = resource.Owner
			case "command":
				resource := model.Command{}
				if err = tx.Where("id = ?", resourceId).First(&resource).Error; err != nil {
					return errors.Wrap(err, "find command  fail")
				}
				owner = resource.Owner
			case "credential":
				resource := model.Credential{}
				if err = tx.Where("id = ?", resourceId).First(&resource).Error; err != nil {
					return errors.Wrap(err, "find credential  fail")

				}
				owner = resource.Owner
			}

			if owner == userId {
				return echo.NewHTTPError(400, "参数错误")
			}

			// 保证同一个资产只能分配给一个用户或者组
			id := utils.Sign([]string{resourceId, resourceType, userId, userGroupId})
			resource := &model.ResourceSharer{
				ID:           id,
				ResourceId:   resourceId,
				ResourceType: resourceType,
				StrategyId:   strategyId,
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

func (r *ResourceSharerRepository) FindAssetIdsByUserId(userId string) (assetIds []string, err error) {
	// 查询当前用户创建的资产
	var ownerAssetIds, sharerAssetIds []string
	asset := model.Asset{}
	err = r.DB.Table(asset.TableName()).Select("id").Where("owner = ?", userId).Find(&ownerAssetIds).Error
	if err != nil {
		return nil, err
	}

	// 查询其他用户授权给该用户的资产
	groupIds, err := userGroupRepository.FindUserGroupIdsByUserId(userId)
	if err != nil {
		return nil, err
	}

	db := r.DB.Table("resource_sharers").Select("resource_id").Where("user_id = ?", userId)
	if len(groupIds) > 0 {
		db = db.Or("user_group_id in ?", groupIds)
	}
	err = db.Find(&sharerAssetIds).Error
	if err != nil {
		return nil, err
	}

	// 合并查询到的资产ID
	assetIds = make([]string, 0)

	if ownerAssetIds != nil {
		assetIds = append(assetIds, ownerAssetIds...)
	}

	if sharerAssetIds != nil {
		assetIds = append(assetIds, sharerAssetIds...)
	}

	return
}

func (r *ResourceSharerRepository) FindByResourceIdAndUserId(assetId, userId string) (resourceSharers []model.ResourceSharer, err error) {
	// 查询其他用户授权给该用户的资产
	groupIds, err := userGroupRepository.FindUserGroupIdsByUserId(userId)
	if err != nil {
		return
	}
	db := r.DB.Where("( resource_id = ? and user_id = ? )", assetId, userId)
	if len(groupIds) > 0 {
		db = db.Or("user_group_id in ?", groupIds)
	}
	err = db.Find(&resourceSharers).Error
	return
}

func (r *ResourceSharerRepository) Find(resourceId, resourceType, userId, userGroupId string) (resourceSharers []model.ResourceSharer, err error) {
	db := r.DB
	if resourceId != "" {
		db = db.Where("resource_id = ?")
	}
	if resourceType != "" {
		db = db.Where("resource_type = ?")
	}
	if userId != "" {
		db = db.Where("user_id = ?")
	}
	if userGroupId != "" {
		db = db.Where("user_group_id = ?")
	}
	err = db.Find(&resourceSharers).Error
	return
}

func (r *ResourceSharerRepository) FindAll() (o []model.ResourceSharer, err error) {
	err = r.DB.Find(&o).Error
	return
}
