package handle

import (
	"next-terminal/pkg/model"
	"next-terminal/pkg/utils"
	"os"
	"time"
)

func RunTicker() {
	var ch chan int
	//定时任务
	ticker := time.NewTicker(time.Minute * 5)
	go func() {
		for range ticker.C {
			items, _ := model.FindAllAsset()

			for i := range items {
				item := items[i]
				active := utils.Tcping(item.IP, item.Port)

				asset := model.Asset{
					Active: active,
				}

				model.UpdateAssetById(&asset, item.ID)
			}
		}
		ch <- 1
	}()
	<-ch
}

func RunDataFix() {
	sessions, _ := model.FindSessionByStatus(model.Connected)
	if sessions == nil {
		return
	}

	for i := range sessions {
		session := model.Session{
			Status:           model.Disconnected,
			DisconnectedTime: utils.NowJsonTime(),
		}

		model.UpdateSessionById(&session, sessions[i].ID)
	}
}

func InitProperties() {
	propertyMap := model.FindAllPropertiesMap()

	if len(propertyMap[model.GuacdHost]) == 0 {
		property := model.Property{
			Name:  model.GuacdHost,
			Value: "127.0.0.1",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[model.GuacdPort]) == 0 {
		property := model.Property{
			Name:  model.GuacdPort,
			Value: "4822",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[model.GuacdDriveName]) == 0 {
		property := model.Property{
			Name:  model.GuacdDriveName,
			Value: "File-System",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[model.GuacdDrivePath]) == 0 {

		path, _ := os.Getwd()

		property := model.Property{
			Name:  model.GuacdDrivePath,
			Value: path + "/drive/",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[model.GuacdFontName]) == 0 {
		property := model.Property{
			Name:  model.GuacdFontName,
			Value: "menlo",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[model.GuacdFontSize]) == 0 {
		property := model.Property{
			Name:  model.GuacdFontSize,
			Value: "12",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[model.GuacdColorScheme]) == 0 {
		property := model.Property{
			Name:  model.GuacdColorScheme,
			Value: "gray-black",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[model.GuacdEnableSftp]) == 0 {
		property := model.Property{
			Name:  model.GuacdEnableSftp,
			Value: "true",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[model.GuacdEnableDrive]) == 0 {
		property := model.Property{
			Name:  model.GuacdEnableDrive,
			Value: "true",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[model.GuacdEnableWallpaper]) == 0 {
		property := model.Property{
			Name:  model.GuacdEnableWallpaper,
			Value: "false",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[model.GuacdEnableTheming]) == 0 {
		property := model.Property{
			Name:  model.GuacdEnableTheming,
			Value: "false",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[model.GuacdEnableFontSmoothing]) == 0 {
		property := model.Property{
			Name:  model.GuacdEnableFontSmoothing,
			Value: "false",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[model.GuacdEnableFullWindowDrag]) == 0 {
		property := model.Property{
			Name:  model.GuacdEnableFullWindowDrag,
			Value: "false",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[model.GuacdEnableDesktopComposition]) == 0 {
		property := model.Property{
			Name:  model.GuacdEnableDesktopComposition,
			Value: "false",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[model.GuacdEnableMenuAnimations]) == 0 {
		property := model.Property{
			Name:  model.GuacdEnableMenuAnimations,
			Value: "false",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[model.GuacdDisableBitmapCaching]) == 0 {
		property := model.Property{
			Name:  model.GuacdDisableBitmapCaching,
			Value: "false",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[model.GuacdDisableOffscreenCaching]) == 0 {
		property := model.Property{
			Name:  model.GuacdDisableOffscreenCaching,
			Value: "false",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[model.GuacdDisableGlyphCaching]) == 0 {
		property := model.Property{
			Name:  model.GuacdDisableGlyphCaching,
			Value: "false",
		}
		_ = model.CreateNewProperty(&property)
	}
}
