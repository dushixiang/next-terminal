package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"next-terminal/server/config"
	"next-terminal/server/constant"
	"next-terminal/server/global/security"
	"next-terminal/server/model"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
)

type Backup struct {
	Users      []model.User      `json:"users"`
	UserGroups []model.UserGroup `json:"user_groups"`

	Storages         []model.Storage          `json:"storages"`
	Strategies       []model.Strategy         `json:"strategies"`
	AccessSecurities []model.AccessSecurity   `json:"access_securities"`
	AccessGateways   []model.AccessGateway    `json:"access_gateways"`
	Commands         []model.Command          `json:"commands"`
	Credentials      []model.Credential       `json:"credentials"`
	Assets           []map[string]interface{} `json:"assets"`
	ResourceSharers  []model.ResourceSharer   `json:"resource_sharers"`
	Jobs             []model.Job              `json:"jobs"`
}

func BackupExportEndpoint(c echo.Context) error {
	users, err := userRepository.FindAll()
	if err != nil {
		return err
	}
	for i := range users {
		users[i].Password = ""
	}
	userGroups, err := userGroupRepository.FindAll()
	if err != nil {
		return err
	}
	if len(userGroups) > 0 {
		for i := range userGroups {
			members, err := userGroupRepository.FindMembersById(userGroups[i].ID)
			if err != nil {
				return err
			}
			userGroups[i].Members = members
		}
	}

	storages, err := storageRepository.FindAll()
	if err != nil {
		return err
	}

	strategies, err := strategyRepository.FindAll()
	if err != nil {
		return err
	}
	jobs, err := jobRepository.FindAll()
	if err != nil {
		return err
	}
	accessSecurities, err := accessSecurityRepository.FindAll()
	if err != nil {
		return err
	}
	accessGateways, err := accessGatewayRepository.FindAll()
	if err != nil {
		return err
	}
	commands, err := commandRepository.FindAll()
	if err != nil {
		return err
	}
	credentials, err := credentialRepository.FindAll()
	if err != nil {
		return err
	}
	if len(credentials) > 0 {
		for i := range credentials {
			if err := credentialRepository.Decrypt(&credentials[i], config.GlobalCfg.EncryptionPassword); err != nil {
				return err
			}
		}
	}
	assets, err := assetRepository.FindAll()
	if err != nil {
		return err
	}
	var assetMaps = make([]map[string]interface{}, 0)
	if len(assets) > 0 {
		for i := range assets {
			asset := assets[i]
			if err := assetRepository.Decrypt(&asset, config.GlobalCfg.EncryptionPassword); err != nil {
				return err
			}
			attributeMap, err := assetRepository.FindAssetAttrMapByAssetId(asset.ID)
			if err != nil {
				return err
			}
			itemMap := utils.StructToMap(asset)
			for key := range attributeMap {
				itemMap[key] = attributeMap[key]
			}
			assetMaps = append(assetMaps, itemMap)
		}
	}

	resourceSharers, err := resourceSharerRepository.FindAll()
	if err != nil {
		return err
	}

	backup := Backup{
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

	jsonBytes, err := json.Marshal(backup)
	if err != nil {
		return err
	}
	c.Response().Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=next-terminal_backup_%s.json", time.Now().Format("20060102150405")))
	return c.Stream(http.StatusOK, echo.MIMEOctetStream, bytes.NewReader(jsonBytes))
}

func BackupImportEndpoint(c echo.Context) error {
	var backup Backup
	if err := c.Bind(&backup); err != nil {
		return err
	}

	var userIdMapping = make(map[string]string, 0)
	if len(backup.Users) > 0 {
		for _, item := range backup.Users {
			if userRepository.ExistByUsername(item.Username) {
				continue
			}
			oldId := item.ID
			newId := utils.UUID()
			item.ID = newId
			item.Password = utils.GenPassword()
			if err := userRepository.Create(&item); err != nil {
				return err
			}
			userIdMapping[oldId] = newId
		}
	}

	var userGroupIdMapping = make(map[string]string, 0)
	if len(backup.UserGroups) > 0 {
		for _, item := range backup.UserGroups {
			oldId := item.ID
			newId := utils.UUID()
			item.ID = newId

			var members = make([]string, 0)
			if len(item.Members) > 0 {
				for _, member := range item.Members {
					members = append(members, userIdMapping[member])
				}
			}

			if err := userGroupRepository.Create(&item, members); err != nil {
				return err
			}
			userGroupIdMapping[oldId] = newId
		}
	}

	if len(backup.Storages) > 0 {
		for _, item := range backup.Storages {
			item.ID = utils.UUID()
			item.Owner = userIdMapping[item.Owner]
			if err := storageRepository.Create(&item); err != nil {
				return err
			}
		}
	}

	var strategyIdMapping = make(map[string]string, 0)
	if len(backup.Strategies) > 0 {
		for _, item := range backup.Strategies {
			oldId := item.ID
			newId := utils.UUID()
			item.ID = newId
			if err := strategyRepository.Create(&item); err != nil {
				return err
			}
			strategyIdMapping[oldId] = newId
		}
	}

	if len(backup.AccessSecurities) > 0 {
		for _, item := range backup.AccessSecurities {
			item.ID = utils.UUID()
			if err := accessSecurityRepository.Create(&item); err != nil {
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
			if err := accessGatewayRepository.Create(&item); err != nil {
				return err
			}
			accessGatewayIdMapping[oldId] = newId
		}
	}

	if len(backup.Commands) > 0 {
		for _, item := range backup.Commands {
			item.ID = utils.UUID()
			if err := commandRepository.Create(&item); err != nil {
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
			if err := credentialRepository.Create(&item); err != nil {
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
			var item model.Asset
			if err := json.Unmarshal(data, &item); err != nil {
				return err
			}

			if item.CredentialId != "" && item.CredentialId != "-" {
				item.CredentialId = credentialIdMapping[item.CredentialId]
			}
			if item.AccessGatewayId != "" && item.AccessGatewayId != "-" {
				item.AccessGatewayId = accessGatewayIdMapping[item.AccessGatewayId]
			}

			oldId := item.ID
			newId := utils.UUID()
			item.ID = newId
			if err := assetRepository.Create(&item); err != nil {
				return err
			}

			if err := assetRepository.UpdateAttributes(item.ID, item.Protocol, m); err != nil {
				return err
			}

			go func() {
				active, _ := assetService.CheckStatus(item.AccessGatewayId, item.IP, item.Port)

				if item.Active != active {
					_ = assetRepository.UpdateActiveById(active, item.ID)
				}
			}()

			assetIdMapping[oldId] = newId
		}
	}

	if len(backup.ResourceSharers) > 0 {
		for _, item := range backup.ResourceSharers {

			userGroupId := userGroupIdMapping[item.UserGroupId]
			userId := userIdMapping[item.UserId]
			strategyId := strategyIdMapping[item.StrategyId]
			resourceId := assetIdMapping[item.ResourceId]

			if err := resourceSharerRepository.AddSharerResources(userGroupId, userId, strategyId, item.ResourceType, []string{resourceId}); err != nil {
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
			if err := jobService.Create(&item); err != nil {
				return err
			}
		}
	}

	return Success(c, "")
}
