package service

import (
	"context"
	"errors"
	"fmt"

	"next-terminal/server/env"
	"next-terminal/server/guacd"
	"next-terminal/server/model"
	"next-terminal/server/repository"

	"gorm.io/gorm"
)

type propertyService struct {
	baseService
}

func (service propertyService) InitProperties() error {
	propertyMap := repository.PropertyRepository.FindAllMap(context.TODO())

	if len(propertyMap[guacd.EnableRecording]) == 0 {
		property := model.Property{
			Name:  guacd.EnableRecording,
			Value: "true",
		}
		if err := repository.PropertyRepository.Create(context.TODO(), &property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.CreateRecordingPath]) == 0 {
		property := model.Property{
			Name:  guacd.CreateRecordingPath,
			Value: "true",
		}
		if err := repository.PropertyRepository.Create(context.TODO(), &property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.FontName]) == 0 {
		property := model.Property{
			Name:  guacd.FontName,
			Value: "menlo",
		}
		if err := repository.PropertyRepository.Create(context.TODO(), &property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.FontSize]) == 0 {
		property := model.Property{
			Name:  guacd.FontSize,
			Value: "12",
		}
		if err := repository.PropertyRepository.Create(context.TODO(), &property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.ColorScheme]) == 0 {
		property := model.Property{
			Name:  guacd.ColorScheme,
			Value: "gray-black",
		}
		if err := repository.PropertyRepository.Create(context.TODO(), &property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.EnableWallpaper]) == 0 {
		property := model.Property{
			Name:  guacd.EnableWallpaper,
			Value: "false",
		}
		if err := repository.PropertyRepository.Create(context.TODO(), &property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.EnableTheming]) == 0 {
		property := model.Property{
			Name:  guacd.EnableTheming,
			Value: "false",
		}
		if err := repository.PropertyRepository.Create(context.TODO(), &property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.EnableFontSmoothing]) == 0 {
		property := model.Property{
			Name:  guacd.EnableFontSmoothing,
			Value: "false",
		}
		if err := repository.PropertyRepository.Create(context.TODO(), &property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.EnableFullWindowDrag]) == 0 {
		property := model.Property{
			Name:  guacd.EnableFullWindowDrag,
			Value: "false",
		}
		if err := repository.PropertyRepository.Create(context.TODO(), &property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.EnableDesktopComposition]) == 0 {
		property := model.Property{
			Name:  guacd.EnableDesktopComposition,
			Value: "false",
		}
		if err := repository.PropertyRepository.Create(context.TODO(), &property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.EnableMenuAnimations]) == 0 {
		property := model.Property{
			Name:  guacd.EnableMenuAnimations,
			Value: "false",
		}
		if err := repository.PropertyRepository.Create(context.TODO(), &property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.DisableBitmapCaching]) == 0 {
		property := model.Property{
			Name:  guacd.DisableBitmapCaching,
			Value: "false",
		}
		if err := repository.PropertyRepository.Create(context.TODO(), &property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.DisableOffscreenCaching]) == 0 {
		property := model.Property{
			Name:  guacd.DisableOffscreenCaching,
			Value: "false",
		}
		if err := repository.PropertyRepository.Create(context.TODO(), &property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.DisableGlyphCaching]) > 0 {
		if err := repository.PropertyRepository.DeleteByName(context.TODO(), guacd.DisableGlyphCaching); err != nil {
			return err
		}
	}
	return nil
}

func (service propertyService) DeleteDeprecatedProperty() error {
	propertyMap := repository.PropertyRepository.FindAllMap(context.TODO())
	if propertyMap[guacd.EnableDrive] != "" {
		if err := repository.PropertyRepository.DeleteByName(context.TODO(), guacd.DriveName); err != nil {
			return err
		}
	}
	if propertyMap[guacd.DrivePath] != "" {
		if err := repository.PropertyRepository.DeleteByName(context.TODO(), guacd.DrivePath); err != nil {
			return err
		}
	}
	if propertyMap[guacd.DriveName] != "" {
		if err := repository.PropertyRepository.DeleteByName(context.TODO(), guacd.DriveName); err != nil {
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
