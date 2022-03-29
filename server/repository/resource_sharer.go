package repository

import (
	"context"

	"next-terminal/server/model"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type resourceSharerRepository struct {
	baseRepository
}

func (r *resourceSharerRepository) OverwriteUserIdsByResourceId(c context.Context, resourceId, resourceType string, userIds []string) (err error) {
	db := r.GetDB(c).Begin()

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

func (r *resourceSharerRepository) DeleteByUserIdAndResourceTypeAndResourceIdIn(c context.Context, userGroupId, userId, resourceType string, resourceIds []string) error {
	db := r.GetDB(c)
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

func (r *resourceSharerRepository) DeleteByResourceId(c context.Context, resourceId string) error {
	return r.GetDB(c).Where("resource_id = ?", resourceId).Delete(&model.ResourceSharer{}).Error
}

func (r *resourceSharerRepository) DeleteByUserId(c context.Context, userId string) error {
	return r.GetDB(c).Where("user_id = ?", userId).Delete(&model.ResourceSharer{}).Error
}

func (r *resourceSharerRepository) DeleteByUserGroupId(c context.Context, userGroupId string) error {
	return r.GetDB(c).Where("user_group_id = ?", userGroupId).Delete(&model.ResourceSharer{}).Error
}

func (r *resourceSharerRepository) AddSharerResource(c context.Context, m *model.ResourceSharer) error {
	return r.GetDB(c).Create(m).Error
}

func (r *resourceSharerRepository) FindAssetIdsByUserId(c context.Context, userId string) (assetIds []string, err error) {
	// 查询当前用户创建的资产
	var ownerAssetIds, sharerAssetIds []string
	asset := model.Asset{}
	err = r.GetDB(c).Table(asset.TableName()).Select("id").Where("owner = ?", userId).Find(&ownerAssetIds).Error
	if err != nil {
		return nil, err
	}

	// 查询其他用户授权给该用户的资产
	groupIds, err := UserGroupMemberRepository.FindUserGroupIdsByUserId(c, userId)
	if err != nil {
		return nil, err
	}

	db := r.GetDB(c).Table("resource_sharers").Select("resource_id").Where("user_id = ?", userId)
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

func (r *resourceSharerRepository) FindByResourceIdAndUserId(c context.Context, assetId, userId string) (resourceSharers []model.ResourceSharer, err error) {
	// 查询其他用户授权给该用户的资产
	groupIds, err := UserGroupMemberRepository.FindUserGroupIdsByUserId(c, userId)
	if err != nil {
		return
	}
	db := r.GetDB(c).Where("( resource_id = ? and user_id = ? )", assetId, userId)
	if len(groupIds) > 0 {
		db = db.Or("user_group_id in ?", groupIds)
	}
	err = db.Find(&resourceSharers).Error
	return
}

func (r *resourceSharerRepository) Find(c context.Context, resourceId, resourceType, userId, userGroupId string) (resourceSharers []model.ResourceSharer, err error) {
	db := r.GetDB(c)
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

func (r *resourceSharerRepository) FindAll(c context.Context) (o []model.ResourceSharer, err error) {
	err = r.GetDB(c).Find(&o).Error
	return
}

func (r *resourceSharerRepository) DeleteById(ctx context.Context, id string) error {
	return r.GetDB(ctx).Where("id = ?", id).Delete(&model.ResourceSharer{}).Error
}
