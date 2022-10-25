package service

import (
	"context"
	"errors"
	"strings"

	"next-terminal/server/branding"
	"next-terminal/server/common"
	"next-terminal/server/env"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"

	"gorm.io/gorm"
)

type resourceSharer struct {
	ID           string `gorm:"primary_key,type:varchar(36)" json:"id"`
	ResourceId   string `gorm:"index,type:varchar(36)" json:"resourceId"`
	ResourceType string `gorm:"index,type:varchar(36)" json:"resourceType"`
	StrategyId   string `gorm:"index,type:varchar(36)" json:"strategyId"`
	UserId       string `gorm:"index,type:varchar(36)" json:"userId"`
	UserGroupId  string `gorm:"index,type:varchar(36)" json:"userGroupId"`
}

var MigrateService = &migrateService{}

type migrateService struct {
	baseService
}

func (s *migrateService) Migrate() error {
	var needMigrate = false
	var localVersion = ""
	property, err := repository.PropertyRepository.FindByName(context.Background(), "version")
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		// 未获取到版本数据
		needMigrate = true
	} else {
		localVersion = property.Value
		// 数据库版本小于当前版本
		needMigrate = strings.Compare(localVersion, branding.Version) < 0
	}

	if !needMigrate {
		return nil
	}

	if err := s.migrateFormV127to130(localVersion); err != nil {
		return err
	}

	return PropertyService.Update(map[string]interface{}{"version": branding.Version})
}

func (s *migrateService) migrateFormV127to130(localVersion string) (err error) {
	if !strings.Contains(localVersion, "beta") && strings.Compare(localVersion, "v1.3.0") > 0 {
		return nil
	}
	err = env.GetDB().Exec(`update strategies set create_dir = 0 where create_dir = ''`).Error
	if err != nil {
		return err
	}

	ctx := context.Background()
	var results []resourceSharer
	err = env.GetDB().Raw(`select * from resource_sharers where resource_type = 'asset'`).Find(&results).Error
	if err != nil {
		// 数据库不存在
		return nil
	}

	// 证明存在旧数据库，执行迁移
	var items []model.Authorised
	for _, result := range results {
		assetId := result.ResourceId
		strategyId := result.StrategyId
		userId := result.UserId
		userGroupId := result.UserGroupId

		id := utils.Sign([]string{assetId, userId, userGroupId})

		if err := repository.AuthorisedRepository.DeleteById(ctx, id); err != nil {
			return err
		}

		authorised := model.Authorised{
			ID:              id,
			AssetId:         assetId,
			CommandFilterId: "",
			StrategyId:      strategyId,
			UserId:          userId,
			UserGroupId:     userGroupId,
			Created:         common.NowJsonTime(),
		}
		items = append(items, authorised)
	}

	err = repository.AuthorisedRepository.CreateInBatches(ctx, items)
	if err != nil {
		return err
	}
	// 删除旧数据库
	return env.GetDB().Exec(`drop table resource_sharers`).Error
}
