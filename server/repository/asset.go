package repository

import (
	"fmt"
	"strings"

	"next-terminal/pkg/constant"
	"next-terminal/pkg/global"
	"next-terminal/server/model"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type AssetRepository struct {
	DB *gorm.DB
}

func NewAssetRepository(db *gorm.DB) *AssetRepository {
	assetRepository = &AssetRepository{DB: db}
	return assetRepository
}

func (r AssetRepository) FindAll() (o []model.Asset, err error) {
	err = r.DB.Find(&o).Error
	return
}

func (r AssetRepository) FindByIds(assetIds []string) (o []model.Asset, err error) {
	err = r.DB.Where("id in ?", assetIds).Find(&o).Error
	return
}

func (r AssetRepository) FindByProtocol(protocol string) (o []model.Asset, err error) {
	err = r.DB.Where("protocol = ?", protocol).Find(&o).Error
	return
}

func (r AssetRepository) FindByProtocolAndIds(protocol string, assetIds []string) (o []model.Asset, err error) {
	err = r.DB.Where("protocol = ? and id in ?", protocol, assetIds).Find(&o).Error
	return
}

func (r AssetRepository) FindByProtocolAndUser(protocol string, account model.User) (o []model.Asset, err error) {
	db := r.DB.Table("assets").Select("assets.id,assets.name,assets.ip,assets.port,assets.protocol,assets.active,assets.owner,assets.created, users.nickname as owner_name,COUNT(resource_sharers.user_id) as sharer_count").Joins("left join users on assets.owner = users.id").Joins("left join resource_sharers on assets.id = resource_sharers.resource_id").Group("assets.id")

	if constant.TypeUser == account.Type {
		owner := account.ID
		db = db.Where("assets.owner = ? or resource_sharers.user_id = ?", owner, owner)
	}

	if len(protocol) > 0 {
		db = db.Where("assets.protocol = ?", protocol)
	}
	err = db.Find(&o).Error
	return
}

func (r AssetRepository) Find(pageIndex, pageSize int, name, protocol, tags string, account model.User, owner, sharer, userGroupId, ip, order, field string) (o []model.AssetVo, total int64, err error) {
	db := r.DB.Table("assets").Select("assets.id,assets.name,assets.ip,assets.port,assets.protocol,assets.active,assets.owner,assets.created,assets.tags, users.nickname as owner_name,COUNT(resource_sharers.user_id) as sharer_count").Joins("left join users on assets.owner = users.id").Joins("left join resource_sharers on assets.id = resource_sharers.resource_id").Group("assets.id")
	dbCounter := r.DB.Table("assets").Select("DISTINCT assets.id").Joins("left join resource_sharers on assets.id = resource_sharers.resource_id").Group("assets.id")

	if constant.TypeUser == account.Type {
		owner := account.ID
		db = db.Where("assets.owner = ? or resource_sharers.user_id = ?", owner, owner)
		dbCounter = dbCounter.Where("assets.owner = ? or resource_sharers.user_id = ?", owner, owner)

		// 查询用户所在用户组列表
		userGroupIds, err := userGroupRepository.FindUserGroupIdsByUserId(account.ID)
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
			if global.Config.DB == "sqlite" {
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
		o = make([]model.AssetVo, 0)
	}
	return
}

func (r AssetRepository) Create(o *model.Asset) (err error) {
	if err = r.DB.Create(o).Error; err != nil {
		return err
	}
	return nil
}

func (r AssetRepository) FindById(id string) (o model.Asset, err error) {
	err = r.DB.Where("id = ?", id).First(&o).Error
	return
}

func (r AssetRepository) UpdateById(o *model.Asset, id string) error {
	o.ID = id
	return r.DB.Updates(o).Error
}

func (r AssetRepository) UpdateActiveById(active bool, id string) error {
	sql := "update assets set active = ? where id = ?"
	return r.DB.Exec(sql, active, id).Error
}

func (r AssetRepository) DeleteById(id string) error {
	return r.DB.Where("id = ?", id).Delete(&model.Asset{}).Error
}

func (r AssetRepository) Count() (total int64, err error) {
	err = r.DB.Find(&model.Asset{}).Count(&total).Error
	return
}

func (r AssetRepository) CountByUserId(userId string) (total int64, err error) {
	db := r.DB.Joins("left join resource_sharers on assets.id = resource_sharers.resource_id")

	db = db.Where("assets.owner = ? or resource_sharers.user_id = ?", userId, userId)

	// 查询用户所在用户组列表
	userGroupIds, err := userGroupRepository.FindUserGroupIdsByUserId(userId)
	if err != nil {
		return 0, err
	}

	if len(userGroupIds) > 0 {
		db = db.Or("resource_sharers.user_group_id in ?", userGroupIds)
	}
	err = db.Find(&model.Asset{}).Count(&total).Error
	return
}

func (r AssetRepository) FindTags() (o []string, err error) {
	var assets []model.Asset
	err = r.DB.Not("tags = ?", "").Find(&assets).Error
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

func (r AssetRepository) UpdateAttributes(assetId, protocol string, m echo.Map) error {
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

	return r.DB.Transaction(func(tx *gorm.DB) error {
		err := tx.Where("asset_id = ?", assetId).Delete(&model.AssetAttribute{}).Error
		if err != nil {
			return err
		}
		return tx.CreateInBatches(&data, len(data)).Error
	})
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

func (r AssetRepository) FindAttrById(assetId string) (o []model.AssetAttribute, err error) {
	err = r.DB.Where("asset_id = ?", assetId).Find(&o).Error
	if o == nil {
		o = make([]model.AssetAttribute, 0)
	}
	return o, err
}

func (r AssetRepository) FindAssetAttrMapByAssetId(assetId string) (map[string]interface{}, error) {
	asset, err := r.FindById(assetId)
	if err != nil {
		return nil, err
	}
	attributes, err := r.FindAttrById(assetId)
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
	propertiesMap := propertyRepository.FindAllMap()
	var attributeMap = make(map[string]interface{})
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
