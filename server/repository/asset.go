package repository

import (
	"context"
	"fmt"
	"strings"

	"next-terminal/server/config"
	"next-terminal/server/constant"
	"next-terminal/server/model"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
)

type assetRepository struct {
	baseRepository
}

func (r assetRepository) FindAll(c context.Context) (o []model.Asset, err error) {
	err = r.GetDB(c).Find(&o).Error
	return
}

func (r assetRepository) FindByIds(c context.Context, assetIds []string) (o []model.Asset, err error) {
	err = r.GetDB(c).Where("id in ?", assetIds).Find(&o).Error
	return
}

func (r assetRepository) FindByProtocol(c context.Context, protocol string) (o []model.Asset, err error) {
	err = r.GetDB(c).Where("protocol = ?", protocol).Find(&o).Error
	return
}

func (r assetRepository) FindByProtocolAndIds(c context.Context, protocol string, assetIds []string) (o []model.Asset, err error) {
	err = r.GetDB(c).Where("protocol = ? and id in ?", protocol, assetIds).Find(&o).Error
	return
}

func (r assetRepository) FindByProtocolAndUser(c context.Context, protocol string, account model.User) (o []model.Asset, err error) {
	db := r.GetDB(c).Table("assets").Select("assets.id,assets.name,assets.ip,assets.port,assets.protocol,assets.active,assets.owner,assets.created,assets.tags,assets.description, users.nickname as owner_name").Joins("left join users on assets.owner = users.id").Joins("left join resource_sharers on assets.id = resource_sharers.resource_id").Group("assets.id")

	if constant.TypeUser == account.Type {
		owner := account.ID
		db = db.Where("assets.owner = ? or resource_sharers.user_id = ?", owner, owner)

		// 查询用户所在用户组列表
		userGroupIds, err := UserGroupMemberRepository.FindUserGroupIdsByUserId(c, account.ID)
		if err != nil {
			return nil, err
		}

		if len(userGroupIds) > 0 {
			db = db.Or("resource_sharers.user_group_id in ?", userGroupIds)
		}
	}

	if len(protocol) > 0 {
		db = db.Where("assets.protocol = ?", protocol)
	}
	err = db.Find(&o).Error
	return
}

func (r assetRepository) Find(c context.Context, pageIndex, pageSize int, name, protocol, tags string, account *model.User, owner, sharer, userGroupId, ip, order, field string) (o []model.AssetForPage, total int64, err error) {
	db := r.GetDB(c).Table("assets").Select("assets.id,assets.name,assets.ip,assets.port,assets.protocol,assets.active,assets.owner,assets.created,assets.tags,assets.description, users.nickname as owner_name").Joins("left join users on assets.owner = users.id").Joins("left join resource_sharers on assets.id = resource_sharers.resource_id").Group("assets.id")
	dbCounter := r.GetDB(c).Table("assets").Select("DISTINCT assets.id").Joins("left join resource_sharers on assets.id = resource_sharers.resource_id").Group("assets.id")

	if constant.TypeUser == account.Type {
		owner := account.ID
		db = db.Where("assets.owner = ? or resource_sharers.user_id = ?", owner, owner)
		dbCounter = dbCounter.Where("assets.owner = ? or resource_sharers.user_id = ?", owner, owner)

		// 查询用户所在用户组列表
		userGroupIds, err := UserGroupMemberRepository.FindUserGroupIdsByUserId(c, account.ID)
		if err != nil {
			return nil, 0, err
		}

		if len(userGroupIds) > 0 {
			db = db.Or("resource_sharers.user_group_id in ?", userGroupIds)
			dbCounter = dbCounter.Or("resource_sharers.user_group_id in ?", userGroupIds)
		}
	} else {
		if len(owner) > 0 {
			db = db.Where("assets.owner = ?", owner)
			dbCounter = dbCounter.Where("assets.owner = ?", owner)
		}
		if len(sharer) > 0 {
			db = db.Where("resource_sharers.user_id = ?", sharer)
			dbCounter = dbCounter.Where("resource_sharers.user_id = ?", sharer)
		}

		if len(userGroupId) > 0 {
			db = db.Where("resource_sharers.user_group_id = ?", userGroupId)
			dbCounter = dbCounter.Where("resource_sharers.user_group_id = ?", userGroupId)
		}
	}

	if len(name) > 0 {
		db = db.Where("assets.name like ?", "%"+name+"%")
		dbCounter = dbCounter.Where("assets.name like ?", "%"+name+"%")
	}

	if len(ip) > 0 {
		db = db.Where("assets.ip like ?", "%"+ip+"%")
		dbCounter = dbCounter.Where("assets.ip like ?", "%"+ip+"%")
	}

	if len(protocol) > 0 {
		db = db.Where("assets.protocol = ?", protocol)
		dbCounter = dbCounter.Where("assets.protocol = ?", protocol)
	}

	if len(tags) > 0 {
		tagArr := strings.Split(tags, ",")
		for i := range tagArr {
			if config.GlobalCfg.DB == "sqlite" {
				db = db.Where("(',' || assets.tags || ',') LIKE ?", "%,"+tagArr[i]+",%")
				dbCounter = dbCounter.Where("(',' || assets.tags || ',') LIKE ?", "%,"+tagArr[i]+",%")
			} else {
				db = db.Where("find_in_set(?, assets.tags)", tagArr[i])
				dbCounter = dbCounter.Where("find_in_set(?, assets.tags)", tagArr[i])
			}
		}
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

	err = db.Order("assets." + field + " " + order).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Find(&o).Error

	if o == nil {
		o = make([]model.AssetForPage, 0)
	} else {
		for i := 0; i < len(o); i++ {
			if o[i].Protocol == "ssh" {
				attributes, err := r.FindAttrById(c, o[i].ID)
				if err != nil {
					continue
				}

				for j := range attributes {
					if attributes[j].Name == constant.SshMode {
						o[i].SshMode = attributes[j].Value
						break
					}
				}
			}
		}
	}
	return
}

func (r assetRepository) Create(c context.Context, o *model.Asset) (err error) {
	return r.GetDB(c).Create(o).Error
}

func (r assetRepository) FindById(c context.Context, id string) (o model.Asset, err error) {
	err = r.GetDB(c).Where("id = ?", id).First(&o).Error
	return
}

func (r assetRepository) UpdateById(c context.Context, o *model.Asset, id string) error {
	o.ID = id
	return r.GetDB(c).Updates(o).Error
}

func (r assetRepository) UpdateActiveById(c context.Context, active bool, id string) error {
	sql := "update assets set active = ? where id = ?"
	return r.GetDB(c).Exec(sql, active, id).Error
}

func (r assetRepository) DeleteById(c context.Context, assetId string) (err error) {
	return r.GetDB(c).Where("id = ?", assetId).Delete(&model.Asset{}).Error
}

func (r assetRepository) DeleteAttrByAssetId(c context.Context, assetId string) error {
	return r.GetDB(c).Where("asset_id = ?", assetId).Delete(&model.AssetAttribute{}).Error
}

func (r assetRepository) Count(c context.Context) (total int64, err error) {
	err = r.GetDB(c).Find(&model.Asset{}).Count(&total).Error
	return
}

func (r assetRepository) CountByProtocol(c context.Context, protocol string) (total int64, err error) {
	err = r.GetDB(c).Find(&model.Asset{}).Where("protocol = ?", protocol).Count(&total).Error
	return
}

func (r assetRepository) CountByUserId(c context.Context, userId string) (total int64, err error) {
	db := r.GetDB(c).Joins("left join resource_sharers on assets.id = resource_sharers.resource_id")

	db = db.Where("assets.owner = ? or resource_sharers.user_id = ?", userId, userId)

	// 查询用户所在用户组列表
	userGroupIds, err := UserGroupMemberRepository.FindUserGroupIdsByUserId(c, userId)
	if err != nil {
		return 0, err
	}

	if len(userGroupIds) > 0 {
		db = db.Or("resource_sharers.user_group_id in ?", userGroupIds)
	}
	err = db.Find(&model.Asset{}).Count(&total).Error
	return
}

func (r assetRepository) CountByUserIdAndProtocol(c context.Context, userId, protocol string) (total int64, err error) {
	db := r.GetDB(c).Joins("left join resource_sharers on assets.id = resource_sharers.resource_id")

	db = db.Where("( assets.owner = ? or resource_sharers.user_id = ? ) and assets.protocol = ?", userId, userId, protocol)

	// 查询用户所在用户组列表
	userGroupIds, err := UserGroupMemberRepository.FindUserGroupIdsByUserId(c, userId)
	if err != nil {
		return 0, err
	}

	if len(userGroupIds) > 0 {
		db = db.Or("resource_sharers.user_group_id in ?", userGroupIds)
	}
	err = db.Find(&model.Asset{}).Count(&total).Error
	return
}

func (r assetRepository) FindTags(c context.Context) (o []string, err error) {
	var assets []model.Asset
	err = r.GetDB(c).Not("tags = '' or tags = '-' ").Find(&assets).Error
	if err != nil {
		return nil, err
	}

	o = make([]string, 0)

	for i := range assets {
		if len(assets[i].Tags) == 0 {
			continue
		}
		split := strings.Split(assets[i].Tags, ",")

		o = append(o, split...)
	}

	return utils.Distinct(o), nil
}

func (r assetRepository) UpdateAttributes(c context.Context, assetId, protocol string, m echo.Map) error {
	var data []model.AssetAttribute
	var parameterNames []string
	switch protocol {
	case "ssh":
		parameterNames = constant.SSHParameterNames
	case "rdp":
		parameterNames = constant.RDPParameterNames
	case "vnc":
		parameterNames = constant.VNCParameterNames
	case "telnet":
		parameterNames = constant.TelnetParameterNames
	case "kubernetes":
		parameterNames = constant.KubernetesParameterNames
	}

	for i := range parameterNames {
		name := parameterNames[i]
		if m[name] != nil && m[name] != "" {
			data = append(data, genAttribute(assetId, name, m))
		}
	}

	err := r.GetDB(c).Where("asset_id = ?", assetId).Delete(&model.AssetAttribute{}).Error
	if err != nil {
		return err
	}
	return r.GetDB(c).CreateInBatches(&data, len(data)).Error
}

func genAttribute(assetId, name string, m echo.Map) model.AssetAttribute {
	value := fmt.Sprintf("%v", m[name])
	attribute := model.AssetAttribute{
		Id:      utils.Sign([]string{assetId, name}),
		AssetId: assetId,
		Name:    name,
		Value:   value,
	}
	return attribute
}

func (r assetRepository) FindAttrById(c context.Context, assetId string) (o []model.AssetAttribute, err error) {
	err = r.GetDB(c).Where("asset_id = ?", assetId).Find(&o).Error
	if o == nil {
		o = make([]model.AssetAttribute, 0)
	}
	return o, err
}

func (r assetRepository) FindAssetAttrMapByAssetId(c context.Context, assetId string) (map[string]string, error) {
	asset, err := r.FindById(c, assetId)
	if err != nil {
		return nil, err
	}
	attributes, err := r.FindAttrById(c, assetId)
	if err != nil {
		return nil, err
	}

	var parameterNames []string
	switch asset.Protocol {
	case "ssh":
		parameterNames = constant.SSHParameterNames
	case "rdp":
		parameterNames = constant.RDPParameterNames
	case "vnc":
		parameterNames = constant.VNCParameterNames
	case "telnet":
		parameterNames = constant.TelnetParameterNames
	case "kubernetes":
		parameterNames = constant.KubernetesParameterNames
	}
	propertiesMap := PropertyRepository.FindAllMap(c)
	var attributeMap = make(map[string]string)
	for name := range propertiesMap {
		if utils.Contains(parameterNames, name) {
			attributeMap[name] = propertiesMap[name]
		}
	}

	for i := range attributes {
		attributeMap[attributes[i].Name] = attributes[i].Value
	}
	return attributeMap, nil
}
