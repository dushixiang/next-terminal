package handle

import (
	"next-terminal/pkg/guacd"
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

	if len(propertyMap[guacd.Host]) == 0 {
		property := model.Property{
			Name:  guacd.Host,
			Value: "127.0.0.1",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[guacd.Port]) == 0 {
		property := model.Property{
			Name:  guacd.Port,
			Value: "4822",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[guacd.EnableRecording]) == 0 {
		property := model.Property{
			Name:  guacd.EnableRecording,
			Value: "true",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[guacd.RecordingPath]) == 0 {
		path, _ := os.Getwd()
		property := model.Property{
			Name:  guacd.RecordingPath,
			Value: path + "/recording/",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[guacd.CreateRecordingPath]) == 0 {
		property := model.Property{
			Name:  guacd.CreateRecordingPath,
			Value: "true",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[guacd.DriveName]) == 0 {
		property := model.Property{
			Name:  guacd.DriveName,
			Value: "File-System",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[guacd.DrivePath]) == 0 {

		path, _ := os.Getwd()

		property := model.Property{
			Name:  guacd.DrivePath,
			Value: path + "/drive/",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[guacd.FontName]) == 0 {
		property := model.Property{
			Name:  guacd.FontName,
			Value: "menlo",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[guacd.FontSize]) == 0 {
		property := model.Property{
			Name:  guacd.FontSize,
			Value: "12",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[guacd.ColorScheme]) == 0 {
		property := model.Property{
			Name:  guacd.ColorScheme,
			Value: "gray-black",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[guacd.EnableDrive]) == 0 {
		property := model.Property{
			Name:  guacd.EnableDrive,
			Value: "true",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[guacd.EnableWallpaper]) == 0 {
		property := model.Property{
			Name:  guacd.EnableWallpaper,
			Value: "false",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[guacd.EnableTheming]) == 0 {
		property := model.Property{
			Name:  guacd.EnableTheming,
			Value: "false",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[guacd.EnableFontSmoothing]) == 0 {
		property := model.Property{
			Name:  guacd.EnableFontSmoothing,
			Value: "false",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[guacd.EnableFullWindowDrag]) == 0 {
		property := model.Property{
			Name:  guacd.EnableFullWindowDrag,
			Value: "false",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[guacd.EnableDesktopComposition]) == 0 {
		property := model.Property{
			Name:  guacd.EnableDesktopComposition,
			Value: "false",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[guacd.EnableMenuAnimations]) == 0 {
		property := model.Property{
			Name:  guacd.EnableMenuAnimations,
			Value: "false",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[guacd.DisableBitmapCaching]) == 0 {
		property := model.Property{
			Name:  guacd.DisableBitmapCaching,
			Value: "false",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[guacd.DisableOffscreenCaching]) == 0 {
		property := model.Property{
			Name:  guacd.DisableOffscreenCaching,
			Value: "false",
		}
		_ = model.CreateNewProperty(&property)
	}

	if len(propertyMap[guacd.DisableGlyphCaching]) == 0 {
		property := model.Property{
			Name:  guacd.DisableGlyphCaching,
			Value: "false",
		}
		_ = model.CreateNewProperty(&property)
	}
}
