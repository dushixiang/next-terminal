package repository

import (
	"gorm.io/gorm"
	"next-terminal/server/guacd"
	"next-terminal/server/model"
)

type PropertyRepository struct {
	DB *gorm.DB
}

func NewPropertyRepository(db *gorm.DB) *PropertyRepository {
	propertyRepository = &PropertyRepository{DB: db}
	return propertyRepository
}

func (r PropertyRepository) FindAll() (o []model.Property) {
	if r.DB.Find(&o).Error != nil {
		return nil
	}
	return
}

func (r PropertyRepository) Create(o *model.Property) (err error) {
	err = r.DB.Create(o).Error
	return
}

func (r PropertyRepository) UpdateByName(o *model.Property, name string) error {
	o.Name = name
	return r.DB.Updates(o).Error
}

func (r PropertyRepository) FindByName(name string) (o model.Property, err error) {
	err = r.DB.Where("name = ?", name).First(&o).Error
	return
}

func (r PropertyRepository) FindAllMap() map[string]string {
	properties := r.FindAll()
	propertyMap := make(map[string]string)
	for i := range properties {
		propertyMap[properties[i].Name] = properties[i].Value
	}
	return propertyMap
}

func (r PropertyRepository) GetDrivePath() (string, error) {
	property, err := r.FindByName(guacd.DrivePath)
	if err != nil {
		return "", err
	}
	return property.Value, nil
}

func (r PropertyRepository) GetRecordingPath() (string, error) {
	property, err := r.FindByName(guacd.RecordingPath)
	if err != nil {
		return "", err
	}
	return property.Value, nil
}
