package model

import (
	"fmt"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
	"next-terminal/pkg/global"
	"next-terminal/pkg/guacd"
	"next-terminal/pkg/utils"
)

type AssetAttribute struct {
	Id      string `gorm:"index" json:"id"`
	AssetId string `gorm:"index" json:"assetId"`
	Name    string `gorm:"index" json:"name"`
	Value   string `json:"value"`
}

func (r *AssetAttribute) TableName() string {
	return "asset_attributes"
}

var SSHParameterNames = []string{guacd.FontName, guacd.FontSize, guacd.ColorScheme, guacd.Backspace, guacd.TerminalType}
var RDPParameterNames = []string{guacd.EnableWallpaper, guacd.EnableTheming, guacd.EnableFontSmoothing, guacd.EnableFullWindowDrag, guacd.EnableDesktopComposition, guacd.EnableMenuAnimations, guacd.DisableBitmapCaching, guacd.DisableOffscreenCaching, guacd.DisableGlyphCaching}
var VNCParameterNames = []string{guacd.ColorDepth, guacd.Cursor, guacd.SwapRedBlue, guacd.DestHost, guacd.DestPort}
var TelnetParameterNames = []string{guacd.FontName, guacd.FontSize, guacd.ColorScheme, guacd.Backspace, guacd.TerminalType, guacd.UsernameRegex, guacd.PasswordRegex, guacd.LoginSuccessRegex, guacd.LoginFailureRegex}

func UpdateAssetAttributes(assetId, protocol string, m echo.Map) error {
	var data []AssetAttribute
	var parameterNames []string
	switch protocol {
	case "ssh":
		parameterNames = SSHParameterNames
	case "rdp":
		parameterNames = RDPParameterNames
	case "vnc":
		parameterNames = VNCParameterNames
	case "telnet":
		parameterNames = TelnetParameterNames
	}

	for i := range parameterNames {
		name := parameterNames[i]
		if m[name] != nil && m[name] != "" {
			data = append(data, genAttribute(assetId, name, m))
		}
	}

	return global.DB.Transaction(func(tx *gorm.DB) error {
		err := tx.Where("asset_id = ?", assetId).Delete(&AssetAttribute{}).Error
		if err != nil {
			return err
		}
		return tx.CreateInBatches(&data, len(data)).Error
	})
}

func genAttribute(assetId, name string, m echo.Map) AssetAttribute {
	value := fmt.Sprintf("%v", m[name])
	attribute := AssetAttribute{
		Id:      utils.Sign([]string{assetId, name}),
		AssetId: assetId,
		Name:    name,
		Value:   value,
	}
	return attribute
}

func FindAssetAttributeByAssetId(assetId string) (o []AssetAttribute, err error) {
	err = global.DB.Where("asset_id = ?", assetId).Find(&o).Error
	if o == nil {
		o = make([]AssetAttribute, 0)
	}
	return o, err
}

func FindAssetAttrMapByAssetId(assetId string) (map[string]interface{}, error) {
	asset, err := FindAssetById(assetId)
	if err != nil {
		return nil, err
	}
	attributes, err := FindAssetAttributeByAssetId(assetId)
	if err != nil {
		return nil, err
	}

	var parameterNames []string
	switch asset.Protocol {
	case "ssh":
		parameterNames = SSHParameterNames
	case "rdp":
		parameterNames = RDPParameterNames
	case "vnc":
		parameterNames = VNCParameterNames
	}
	propertiesMap := FindAllPropertiesMap()
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
