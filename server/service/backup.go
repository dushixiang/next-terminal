package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"next-terminal/server/config"
	"next-terminal/server/constant"
	"next-terminal/server/dto"
	"next-terminal/server/env"
	"next-terminal/server/global/security"
	"next-terminal/server/repository"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type backupService struct {
	baseService
}

func (service backupService) Export() (error, *dto.Backup) {
	ctx := context.TODO()
	users, err := repository.UserRepository.FindAll(ctx)
	if err != nil {
		return err, nil
	}
	for i := range users {
		users[i].Password = ""
	}
	userGroups, err := repository.UserGroupRepository.FindAll(ctx)
	if err != nil {
		return err, nil
	}
	if len(userGroups) > 0 {
		for i := range userGroups {
			members, err := repository.UserGroupMemberRepository.FindUserIdsByUserGroupId(ctx, userGroups[i].ID)
			if err != nil {
				return err, nil
			}
			userGroups[i].Members = members
		}
	}

	storages, err := repository.StorageRepository.FindAll(ctx)
	if err != nil {
		return err, nil
	}

	strategies, err := repository.StrategyRepository.FindAll(ctx)
	if err != nil {
		return err, nil
	}
	jobs, err := repository.JobRepository.FindAll(ctx)
	if err != nil {
		return err, nil
	}
	accessSecurities, err := repository.SecurityRepository.FindAll(ctx)
	if err != nil {
		return err, nil
	}
	accessGateways, err := repository.GatewayRepository.FindAll(ctx)
	if err != nil {
		return err, nil
	}
	commands, err := repository.CommandRepository.FindAll(ctx)
	if err != nil {
		return err, nil
	}
	credentials, err := repository.CredentialRepository.FindAll(ctx)
	if err != nil {
		return err, nil
	}
	if len(credentials) > 0 {
		for i := range credentials {
			if err := CredentialService.Decrypt(&credentials[i], config.GlobalCfg.EncryptionPassword); err != nil {
				return err, nil
			}
		}
	}
	assets, err := repository.AssetRepository.FindAll(ctx)
	if err != nil {
		return err, nil
	}
	var assetMaps = make([]map[string]interface{}, 0)
	if len(assets) > 0 {
		for i := range assets {
			asset := assets[i]
			if err := AssetService.Decrypt(&asset, config.GlobalCfg.EncryptionPassword); err != nil {
				return err, nil
			}
			attributeMap, err := repository.AssetRepository.FindAssetAttrMapByAssetId(ctx, asset.ID)
			if err != nil {
				return err, nil
			}
			itemMap := utils.StructToMap(asset)
			for key := range attributeMap {
				itemMap[key] = attributeMap[key]
			}
			itemMap["created"] = asset.Created.Format("2006-01-02 15:04:05")
			assetMaps = append(assetMaps, itemMap)
		}
	}

	resourceSharers, err := repository.ResourceSharerRepository.FindAll(ctx)
	if err != nil {
		return err, nil
	}

	backup := dto.Backup{
		Users:            users,
		UserGroups:       userGroups,
		Storages:         storages,
		Strategies:       strategies,
		Jobs:             jobs,
		AccessSecurities: accessSecurities,
		AccessGateways:   accessGateways,
		Commands:         commands,
		Credentials:      credentials,
		Assets:           assetMaps,
		ResourceSharers:  resourceSharers,
	}
	return nil, &backup
}

func (service backupService) Import(backup *dto.Backup) error {
	return env.GetDB().Transaction(func(tx *gorm.DB) error {
		c := service.Context(tx)
		var userIdMapping = make(map[string]string)
		if len(backup.Users) > 0 {
			for _, item := range backup.Users {
				oldId := item.ID
				if repository.UserRepository.ExistByUsername(c, item.Username) {
					delete(userIdMapping, oldId)
					continue
				}
				newId := utils.UUID()
				item.ID = newId
				item.Password = utils.GenPassword()
				if err := repository.UserRepository.Create(c, &item); err != nil {
					return err
				}
				userIdMapping[oldId] = newId
			}
		}

		var userGroupIdMapping = make(map[string]string)
		if len(backup.UserGroups) > 0 {
			for _, item := range backup.UserGroups {
				oldId := item.ID

				var members = make([]string, 0)
				if len(item.Members) > 0 {
					for _, member := range item.Members {
						members = append(members, userIdMapping[member])
					}
				}

				userGroup, err := UserGroupService.Create(item.Name, members)
				if err != nil {
					if errors.Is(constant.ErrNameAlreadyUsed, err) {
						// 删除名称重复的用户组
						delete(userGroupIdMapping, oldId)
						continue
					} else {
						return err
					}
				}

				userGroupIdMapping[oldId] = userGroup.ID
			}
		}

		if len(backup.Storages) > 0 {
			for _, item := range backup.Storages {
				owner := userIdMapping[item.Owner]
				if owner == "" {
					continue
				}
				item.ID = utils.UUID()
				item.Owner = owner
				item.Created = utils.NowJsonTime()
				if err := repository.StorageRepository.Create(c, &item); err != nil {
					return err
				}
			}
		}

		var strategyIdMapping = make(map[string]string)
		if len(backup.Strategies) > 0 {
			for _, item := range backup.Strategies {
				oldId := item.ID
				newId := utils.UUID()
				item.ID = newId
				item.Created = utils.NowJsonTime()
				if err := repository.StrategyRepository.Create(c, &item); err != nil {
					return err
				}
				strategyIdMapping[oldId] = newId
			}
		}

		if len(backup.AccessSecurities) > 0 {
			for _, item := range backup.AccessSecurities {
				item.ID = utils.UUID()
				if err := repository.SecurityRepository.Create(c, &item); err != nil {
					return err
				}
				// 更新内存中的安全规则
				rule := &security.Security{
					ID:       item.ID,
					IP:       item.IP,
					Rule:     item.Rule,
					Priority: item.Priority,
				}
				security.GlobalSecurityManager.Add <- rule
			}
		}

		var accessGatewayIdMapping = make(map[string]string, 0)
		if len(backup.AccessGateways) > 0 {
			for _, item := range backup.AccessGateways {
				oldId := item.ID
				newId := utils.UUID()
				item.ID = newId
				item.Created = utils.NowJsonTime()
				if err := repository.GatewayRepository.Create(c, &item); err != nil {
					return err
				}
				accessGatewayIdMapping[oldId] = newId
			}
		}

		if len(backup.Commands) > 0 {
			for _, item := range backup.Commands {
				item.ID = utils.UUID()
				item.Created = utils.NowJsonTime()
				if err := repository.CommandRepository.Create(c, &item); err != nil {
					return err
				}
			}
		}

		var credentialIdMapping = make(map[string]string, 0)
		if len(backup.Credentials) > 0 {
			for _, item := range backup.Credentials {
				oldId := item.ID
				newId := utils.UUID()
				item.ID = newId
				if err := CredentialService.Create(&item); err != nil {
					return err
				}
				credentialIdMapping[oldId] = newId
			}
		}

		var assetIdMapping = make(map[string]string, 0)
		if len(backup.Assets) > 0 {
			for _, m := range backup.Assets {
				data, err := json.Marshal(m)
				if err != nil {
					return err
				}
				m := echo.Map{}
				if err := json.Unmarshal(data, &m); err != nil {
					return err
				}
				credentialId := m["credentialId"].(string)
				accessGatewayId := m["accessGatewayId"].(string)
				if credentialId != "" && credentialId != "-" {
					m["credentialId"] = credentialIdMapping[credentialId]
				}
				if accessGatewayId != "" && accessGatewayId != "-" {
					m["accessGatewayId"] = accessGatewayIdMapping[accessGatewayId]
				}

				oldId := m["id"].(string)
				asset, err := AssetService.Create(m)
				if err != nil {
					return err
				}

				assetIdMapping[oldId] = asset.ID
			}
		}

		if len(backup.ResourceSharers) > 0 {
			for _, item := range backup.ResourceSharers {

				userGroupId := userGroupIdMapping[item.UserGroupId]
				userId := userIdMapping[item.UserId]
				strategyId := strategyIdMapping[item.StrategyId]
				resourceId := assetIdMapping[item.ResourceId]

				if err := repository.ResourceSharerRepository.AddSharerResources(userGroupId, userId, strategyId, item.ResourceType, []string{resourceId}); err != nil {
					return err
				}
			}
		}

		if len(backup.Jobs) > 0 {
			for _, item := range backup.Jobs {
				if item.Func == constant.FuncCheckAssetStatusJob {
					continue
				}

				resourceIds := strings.Split(item.ResourceIds, ",")
				if len(resourceIds) > 0 {
					var newResourceIds = make([]string, 0)
					for _, resourceId := range resourceIds {
						newResourceIds = append(newResourceIds, assetIdMapping[resourceId])
					}
					item.ResourceIds = strings.Join(newResourceIds, ",")
				}
				if err := JobService.Create(&item); err != nil {
					return err
				}
			}
		}
		return nil
	})

}
