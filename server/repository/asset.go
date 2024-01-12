package repository

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"next-terminal/server/common"
	"next-terminal/server/common/maps"
	"next-terminal/server/common/nt"
	"next-terminal/server/config"
	"next-terminal/server/model"
	"next-terminal/server/utils"
)

var AssetRepository = new(assetRepository)

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
	db := r.GetDB(c)
	if protocol != "" {
		db = db.Where("protocol = ?", protocol)
	}
	err = db.Order("name asc").Find(&o).Error
	return
}

func (r assetRepository) FindByProtocolAndIds(c context.Context, protocol string, assetIds []string) (o []model.Asset, err error) {
	err = r.GetDB(c).Where("protocol = ? and id in ?", protocol, assetIds).Find(&o).Error
	return
}

func (r assetRepository) Find(c context.Context, pageIndex, pageSize int, name, protocol, tags, ip, port, active, order, field string) (o []model.AssetForPage, total int64, err error) {
	db := r.GetDB(c).Table("assets").Select("assets.id,assets.name,assets.ip,assets.port,assets.protocol,assets.active,assets.active_message,assets.owner,assets.created,assets.last_access_time,assets.tags,assets.description, users.nickname as owner_name").Joins("left join users on assets.owner = users.id")
	dbCounter := r.GetDB(c).Table("assets")

	if len(name) > 0 {
		db = db.Where("assets.name like ?", "%"+name+"%")
		dbCounter = dbCounter.Where("assets.name like ?", "%"+name+"%")
	}

	if len(ip) > 0 {
		db = db.Where("assets.ip like ?", "%"+ip+"%")
		dbCounter = dbCounter.Where("assets.ip like ?", "%"+ip+"%")
	}

	if len(port) > 0 {
		db = db.Where("assets.port = ?", port)
		dbCounter = dbCounter.Where("assets.port = ?", ip)
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

	if active != "" {
		_active, err := strconv.ParseBool(active)
		if err == nil {
			db = db.Where("assets.active = ?", _active)
			dbCounter = dbCounter.Where("assets.active = ?", _active)
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

	switch field {
	case "name":
	case "protocol":
	case "ip":
	case "active":
	case "lastAccessTime":
		field = "last_access_time"
	default:
		field = "created"
	}

	err = db.Order("assets." + field + " " + order).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Find(&o).Error

	if o == nil {
		o = make([]model.AssetForPage, 0)
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

func (r assetRepository) UpdateActiveById(c context.Context, active bool, message, id string) error {
	sql := "update assets set active = ?, active_message = ?  where id = ?"
	return r.GetDB(c).Exec(sql, active, message, id).Error
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

func (r assetRepository) CountByActive(c context.Context, active bool) (total int64, err error) {
	err = r.GetDB(c).Find(&model.Asset{}).Where("active = ?", active).Count(&total).Error
	return
}

func (r assetRepository) CountByProtocol(c context.Context, protocol string) (total int64, err error) {
	err = r.GetDB(c).Find(&model.Asset{}).Where("protocol = ?", protocol).Count(&total).Error
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

func (r assetRepository) UpdateAttributes(c context.Context, assetId, protocol string, m maps.Map) error {
	var data []model.AssetAttribute
	var parameterNames []string
	switch protocol {
	case "ssh":
		parameterNames = nt.SSHParameterNames
	case "rdp":
		parameterNames = nt.RDPParameterNames
	case "vnc":
		parameterNames = nt.VNCParameterNames
	case "telnet":
		parameterNames = nt.TelnetParameterNames
	case "kubernetes":
		parameterNames = nt.KubernetesParameterNames
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

func genAttribute(assetId, name string, m maps.Map) model.AssetAttribute {
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

func (r assetRepository) FindAssetByName(c context.Context, name string, protocol string) (o model.Asset, err error) {
	err = r.GetDB(c).Where("name = ? and protocol = ?", name, protocol).First(&o).Error
	return
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
		parameterNames = nt.SSHParameterNames
	case "rdp":
		parameterNames = nt.RDPParameterNames
	case "vnc":
		parameterNames = nt.VNCParameterNames
	case "telnet":
		parameterNames = nt.TelnetParameterNames
	case "kubernetes":
		parameterNames = nt.KubernetesParameterNames
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

func (r assetRepository) UpdateAttrs(c context.Context, name, value, newValue string) error {
	sql := "update asset_attributes set value = ? where name = ? and value = ?"
	return r.GetDB(c).Exec(sql, newValue, name, value).Error
}

func (r assetRepository) ExistById(c context.Context, id string) (bool, error) {
	m := model.Asset{}
	var count uint64
	err := r.GetDB(c).Table(m.TableName()).Select("count(*)").
		Where("id = ?", id).
		Find(&count).
		Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r assetRepository) FindMyAssets(c context.Context, pageIndex, pageSize int, name, protocol, tags string, assetIds []string, order, field string) (o []model.AssetForPage, total int64, err error) {
	db := r.GetDB(c).Table("assets").Select("assets.id,assets.name,assets.protocol,assets.active,assets.active_message,assets.tags,assets.description,assets.last_access_time").
		Where("id in ?", assetIds)
	dbCounter := r.GetDB(c).Table("assets").Where("id in ?", assetIds)

	if len(name) > 0 {
		db = db.Where("assets.name like ?", "%"+name+"%")
		dbCounter = dbCounter.Where("assets.name like ?", "%"+name+"%")
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

	switch field {
	case "name":
	case "protocol":
	case "ip":
	case "active":
	case "lastAccessTime":
		field = "last_access_time"
	default:
		field = "created"
	}

	err = db.Order("assets." + field + " " + order).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Find(&o).Error

	if o == nil {
		o = make([]model.AssetForPage, 0)
	}
	return
}

func (r assetRepository) FindMyAssetTags(c context.Context, assetIds []string) (o []string, err error) {

	var assets []model.Asset
	err = r.GetDB(c).Not("tags = '' or tags = '-' ").Where("id in ?", assetIds).Find(&assets).Error
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

func (r assetRepository) UpdateLastAccessTime(ctx context.Context, assetId string, now common.JsonTime) error {
	asset := &model.Asset{ID: assetId, LastAccessTime: now}
	return r.GetDB(ctx).Table("assets").Updates(asset).Error
}
