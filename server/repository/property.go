package repository

import (
	"next-terminal/server/model"

	"gorm.io/gorm"
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

func (r PropertyRepository) DeleteByName(name string) error {
	return r.DB.Where("name = ?", name).Delete(model.Property{}).Error
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
