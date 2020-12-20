package model

import (
	"next-terminal/pkg/config"
	"errors"
)

const (
	GuacdHost = "host"
	GuacdPort = "port"

	GuacdFontName    = "font-name"
	GuacdFontSize    = "font-size"
	GuacdColorScheme = "color-scheme"
	GuacdEnableSftp  = "enable-sftp"

	GuacdEnableDrive              = "enable-drive"
	GuacdDriveName                = "drive-name"
	GuacdDrivePath                = "drive-path"
	GuacdEnableWallpaper          = "enable-wallpaper"
	GuacdEnableTheming            = "enable-theming"
	GuacdEnableFontSmoothing      = "enable-font-smoothing"
	GuacdEnableFullWindowDrag     = "enable-full-window-drag"
	GuacdEnableDesktopComposition = "enable-desktop-composition"
	GuacdEnableMenuAnimations     = "enable-menu-animations"
	GuacdDisableBitmapCaching     = "disable-bitmap-caching"
	GuacdDisableOffscreenCaching  = "disable-offscreen-caching"
	GuacdDisableGlyphCaching      = "disable-glyph-caching"
)

type Property struct {
	Name  string `gorm:"primary_key" json:"name"`
	Value string `json:"value"`
}

func (r *Property) TableName() string {
	return "properties"
}

func FindAllProperties() (o []Property) {
	if config.DB.Find(&o).Error != nil {
		return nil
	}
	return
}

func CreateNewProperty(o *Property) (err error) {
	err = config.DB.Create(o).Error
	return
}

func UpdatePropertyByName(o *Property, name string) {
	o.Name = name
	config.DB.Updates(o)
}

func FindPropertyByName(name string) (o Property, err error) {
	err = config.DB.Where("name = ?", name).First(&o).Error
	return
}

func FindAllPropertiesMap() map[string]string {
	properties := FindAllProperties()
	propertyMap := make(map[string]string)
	for i := range properties {
		propertyMap[properties[i].Name] = properties[i].Value
	}
	return propertyMap
}

func GetDrivePath() (string, error) {
	propertiesMap := FindAllPropertiesMap()
	drivePath := propertiesMap[GuacdDrivePath]
	if len(drivePath) == 0 {
		return "", errors.New("获取RDP挂载目录失败")
	}
	return drivePath, nil
}
