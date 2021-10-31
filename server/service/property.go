package service

import (
	"next-terminal/server/guacd"
	"next-terminal/server/model"
	"next-terminal/server/repository"
)

type PropertyService struct {
	propertyRepository *repository.PropertyRepository
}

func NewPropertyService(propertyRepository *repository.PropertyRepository) *PropertyService {
	return &PropertyService{propertyRepository: propertyRepository}
}

func (r PropertyService) InitProperties() error {
	propertyMap := r.propertyRepository.FindAllMap()

	if len(propertyMap[guacd.EnableRecording]) == 0 {
		property := model.Property{
			Name:  guacd.EnableRecording,
			Value: "true",
		}
		if err := r.propertyRepository.Create(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.CreateRecordingPath]) == 0 {
		property := model.Property{
			Name:  guacd.CreateRecordingPath,
			Value: "true",
		}
		if err := r.propertyRepository.Create(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.FontName]) == 0 {
		property := model.Property{
			Name:  guacd.FontName,
			Value: "menlo",
		}
		if err := r.propertyRepository.Create(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.FontSize]) == 0 {
		property := model.Property{
			Name:  guacd.FontSize,
			Value: "12",
		}
		if err := r.propertyRepository.Create(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.ColorScheme]) == 0 {
		property := model.Property{
			Name:  guacd.ColorScheme,
			Value: "gray-black",
		}
		if err := r.propertyRepository.Create(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.EnableWallpaper]) == 0 {
		property := model.Property{
			Name:  guacd.EnableWallpaper,
			Value: "false",
		}
		if err := r.propertyRepository.Create(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.EnableTheming]) == 0 {
		property := model.Property{
			Name:  guacd.EnableTheming,
			Value: "false",
		}
		if err := r.propertyRepository.Create(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.EnableFontSmoothing]) == 0 {
		property := model.Property{
			Name:  guacd.EnableFontSmoothing,
			Value: "false",
		}
		if err := r.propertyRepository.Create(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.EnableFullWindowDrag]) == 0 {
		property := model.Property{
			Name:  guacd.EnableFullWindowDrag,
			Value: "false",
		}
		if err := r.propertyRepository.Create(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.EnableDesktopComposition]) == 0 {
		property := model.Property{
			Name:  guacd.EnableDesktopComposition,
			Value: "false",
		}
		if err := r.propertyRepository.Create(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.EnableMenuAnimations]) == 0 {
		property := model.Property{
			Name:  guacd.EnableMenuAnimations,
			Value: "false",
		}
		if err := r.propertyRepository.Create(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.DisableBitmapCaching]) == 0 {
		property := model.Property{
			Name:  guacd.DisableBitmapCaching,
			Value: "false",
		}
		if err := r.propertyRepository.Create(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.DisableOffscreenCaching]) == 0 {
		property := model.Property{
			Name:  guacd.DisableOffscreenCaching,
			Value: "false",
		}
		if err := r.propertyRepository.Create(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.DisableGlyphCaching]) == 0 {
		property := model.Property{
			Name:  guacd.DisableGlyphCaching,
			Value: "true",
		}
		if err := r.propertyRepository.Create(&property); err != nil {
			return err
		}
	}
	return nil
}

func (r PropertyService) DeleteDeprecatedProperty() error {
	propertyMap := r.propertyRepository.FindAllMap()
	if propertyMap[guacd.EnableDrive] != "" {
		if err := r.propertyRepository.DeleteByName(guacd.DriveName); err != nil {
			return err
		}
	}
	if propertyMap[guacd.DrivePath] != "" {
		if err := r.propertyRepository.DeleteByName(guacd.DrivePath); err != nil {
			return err
		}
	}
	if propertyMap[guacd.DriveName] != "" {
		if err := r.propertyRepository.DeleteByName(guacd.DriveName); err != nil {
			return err
		}
	}
	return nil
}
