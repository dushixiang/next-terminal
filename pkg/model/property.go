package model

import (
	"next-terminal/pkg/config"
	"next-terminal/pkg/guacd"
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
	property, err := FindPropertyByName(guacd.DrivePath)
	if err != nil {
		return "", err
	}
	return property.Value, nil
}

func GetRecordingPath() (string, error) {
	property, err := FindPropertyByName(guacd.RecordingPath)
	if err != nil {
		return "", err
	}
	return property.Value, nil
}
