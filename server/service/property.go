package service

import (
	"context"
	"errors"
	"fmt"

	"next-terminal/server/common/guacamole"
	"next-terminal/server/env"
	"next-terminal/server/model"
	"next-terminal/server/repository"

	"gorm.io/gorm"
)

var PropertyService = new(propertyService)

type propertyService struct {
	baseService
}

var deprecatedPropertyNames = []string{
	guacamole.EnableDrive,
	guacamole.DrivePath,
	guacamole.DriveName,
	guacamole.DisableGlyphCaching,
	guacamole.CreateRecordingPath,
}

var defaultProperties = map[string]string{
	guacamole.EnableRecording:          "true",
	guacamole.FontName:                 "menlo",
	guacamole.FontSize:                 "12",
	guacamole.ColorScheme:              "gray-black",
	guacamole.EnableWallpaper:          "true",
	guacamole.EnableTheming:            "true",
	guacamole.EnableFontSmoothing:      "true",
	guacamole.EnableFullWindowDrag:     "true",
	guacamole.EnableDesktopComposition: "true",
	guacamole.EnableMenuAnimations:     "true",
	guacamole.DisableBitmapCaching:     "false",
	guacamole.DisableOffscreenCaching:  "false",
	"cron-log-saved-limit":             "360",
	"login-log-saved-limit":            "360",
	"session-saved-limit":              "360",
	"user-default-storage-size":        "5120",
}

func (service propertyService) InitProperties() error {
	propertyMap := repository.PropertyRepository.FindAllMap(context.TODO())

	for name, value := range defaultProperties {
		if err := service.CreateIfAbsent(propertyMap, name, value); err != nil {
			return err
		}
	}

	return nil
}

func (service propertyService) CreateIfAbsent(propertyMap map[string]string, name, value string) error {
	if len(propertyMap[name]) == 0 {
		property := model.Property{
			Name:  name,
			Value: value,
		}
		return repository.PropertyRepository.Create(context.TODO(), &property)
	}
	return nil
}

func (service propertyService) DeleteDeprecatedProperty() error {
	propertyMap := repository.PropertyRepository.FindAllMap(context.TODO())
	for _, name := range deprecatedPropertyNames {
		if propertyMap[name] == "" {
			continue
		}
		if err := repository.PropertyRepository.DeleteByName(context.TODO(), name); err != nil {
			return err
		}
	}
	return nil
}

func (service propertyService) Update(item map[string]interface{}) error {
	return env.GetDB().Transaction(func(tx *gorm.DB) error {
		c := service.Context(tx)
		for key := range item {
			value := fmt.Sprintf("%v", item[key])
			if value == "" {
				value = "-"
			}

			property := model.Property{
				Name:  key,
				Value: value,
			}

			if key == "enable-ldap" && value == "false" {
				if err := UserService.DeleteALlLdapUser(c); err != nil {
					return err
				}
			}

			_, err := repository.PropertyRepository.FindByName(c, key)
			if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
				if err := repository.PropertyRepository.Create(c, &property); err != nil {
					return err
				}
			} else {
				if err := repository.PropertyRepository.UpdateByName(c, &property, key); err != nil {
					return err
				}
			}
		}
		return nil
	})

}
