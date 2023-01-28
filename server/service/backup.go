package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"next-terminal/server/common"
	"next-terminal/server/common/maps"
	"next-terminal/server/common/nt"
	"next-terminal/server/config"
	"next-terminal/server/dto"
	"next-terminal/server/env"
	"next-terminal/server/global/security"
	"next-terminal/server/repository"
	"next-terminal/server/utils"

	"gorm.io/gorm"
)

var BackupService = new(backupService)

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
	}
	return nil, &backup
}

func (service backupService) Import(backup *dto.Backup) error {
	return env.GetDB().Transaction(func(tx *gorm.DB) error {
		ctx := service.Context(tx)
		var userIdMapping = make(map[string]string)
		if len(backup.Users) > 0 {
			for _, item := range backup.Users {
				oldId := item.ID
				exist, err := repository.UserRepository.ExistByUsername(ctx, item.Username)
				if err != nil {
					return err
				}
				if exist {
					delete(userIdMapping, oldId)
					continue
				}
				newId := utils.UUID()
				item.ID = newId
				item.Password = utils.GenPassword()
				if err := repository.UserRepository.Create(ctx, &item); err != nil {
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

				userGroup, err := UserGroupService.Create(ctx, item.Name, members)
				if err != nil {
					if errors.Is(nt.ErrNameAlreadyUsed, err) {
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
				item.ID = utils.UUID()
				item.Owner = userIdMapping[item.Owner]
				item.Created = common.NowJsonTime()
				if err := repository.StorageRepository.Create(ctx, &item); err != nil {
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
				item.Created = common.NowJsonTime()
				if err := repository.StrategyRepository.Create(ctx, &item); err != nil {
					return err
				}
				strategyIdMapping[oldId] = newId
			}
		}

		if len(backup.AccessSecurities) > 0 {
			for _, item := range backup.AccessSecurities {
				item.ID = utils.UUID()
				if err := repository.SecurityRepository.Create(ctx, &item); err != nil {
					return err
				}
				// 更新内存中的安全规则
				rule := &security.Security{
					ID:       item.ID,
					IP:       item.IP,
					Rule:     item.Rule,
					Priority: item.Priority,
				}
				security.GlobalSecurityManager.Add(rule)
			}
		}

		var accessGatewayIdMapping = make(map[string]string)
		if len(backup.AccessGateways) > 0 {
			for _, item := range backup.AccessGateways {
				oldId := item.ID
				newId := utils.UUID()
				item.ID = newId
				item.Created = common.NowJsonTime()
				if err := repository.GatewayRepository.Create(ctx, &item); err != nil {
					return err
				}
				accessGatewayIdMapping[oldId] = newId
			}
		}

		if len(backup.Commands) > 0 {
			for _, item := range backup.Commands {
				item.ID = utils.UUID()
				item.Created = common.NowJsonTime()
				if err := repository.CommandRepository.Create(ctx, &item); err != nil {
					return err
				}
			}
		}

		var credentialIdMapping = make(map[string]string)
		if len(backup.Credentials) > 0 {
			for _, item := range backup.Credentials {
				oldId := item.ID
				newId := utils.UUID()
				item.ID = newId
				item.Owner = userIdMapping[item.Owner]
				if err := CredentialService.Create(ctx, &item); err != nil {
					return err
				}
				credentialIdMapping[oldId] = newId
			}
		}

		var assetIdMapping = make(map[string]string)
		if len(backup.Assets) > 0 {
			for _, m := range backup.Assets {
				data, err := json.Marshal(m)
				if err != nil {
					return err
				}
				m := maps.Map{}
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
				m["owner"] = userIdMapping[m["owner"].(string)]
				asset, err := AssetService.Create(ctx, m)
				if err != nil {
					return err
				}

				assetIdMapping[oldId] = asset.ID
			}
		}

		if len(backup.Jobs) > 0 {
			for _, item := range backup.Jobs {
				if item.Func == nt.FuncCheckAssetStatusJob {
					continue
				}

				item.ID = utils.UUID()
				resourceIds := strings.Split(item.ResourceIds, ",")
				if len(resourceIds) > 0 {
					var newResourceIds = make([]string, 0)
					for _, resourceId := range resourceIds {
						newResourceIds = append(newResourceIds, assetIdMapping[resourceId])
					}
					item.ResourceIds = strings.Join(newResourceIds, ",")
				}
				if err := JobService.Create(ctx, &item); err != nil {
					return err
				}
			}
		}
		return nil
	})

}
