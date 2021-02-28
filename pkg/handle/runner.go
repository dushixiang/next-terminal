package handle

import (
	"next-terminal/pkg/global"
	"next-terminal/pkg/guacd"
	"next-terminal/pkg/model"
	"next-terminal/pkg/utils"
	"os"
)

func RunTicker() {

	// 每隔一小时删除一次未使用的会话信息
	_, _ = global.Cron.AddJob("0 0 0/1 * * ?", model.DelUnUsedSessionJob{})
	// 每隔一小时检测一次资产状态
	//_, _ = global.Cron.AddJob("0 0 0/1 * * ?", model.CheckAssetStatusJob{})
	// 每日凌晨删除超过时长限制的会话
	//_, _ = global.Cron.AddJob("0 0 0 * * ?", model.DelTimeoutSessionJob{})

	global.Cron.Start()
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

		_ = model.UpdateSessionById(&session, sessions[i].ID)
	}
}

func InitProperties() error {
	propertyMap := model.FindAllPropertiesMap()

	if len(propertyMap[guacd.Host]) == 0 {
		property := model.Property{
			Name:  guacd.Host,
			Value: "127.0.0.1",
		}
		if err := model.CreateNewProperty(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.Port]) == 0 {
		property := model.Property{
			Name:  guacd.Port,
			Value: "4822",
		}
		if err := model.CreateNewProperty(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.EnableRecording]) == 0 {
		property := model.Property{
			Name:  guacd.EnableRecording,
			Value: "true",
		}
		if err := model.CreateNewProperty(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.RecordingPath]) == 0 {
		path, _ := os.Getwd()
		property := model.Property{
			Name:  guacd.RecordingPath,
			Value: path + "/recording/",
		}
		if !utils.FileExists(property.Value) {
			if err := os.Mkdir(property.Value, os.ModePerm); err != nil {
				return err
			}
		}
		if err := model.CreateNewProperty(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.CreateRecordingPath]) == 0 {
		property := model.Property{
			Name:  guacd.CreateRecordingPath,
			Value: "true",
		}
		if err := model.CreateNewProperty(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.DriveName]) == 0 {
		property := model.Property{
			Name:  guacd.DriveName,
			Value: "File-System",
		}
		if err := model.CreateNewProperty(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.DrivePath]) == 0 {

		path, _ := os.Getwd()

		property := model.Property{
			Name:  guacd.DrivePath,
			Value: path + "/drive/",
		}
		if !utils.FileExists(property.Value) {
			if err := os.Mkdir(property.Value, os.ModePerm); err != nil {
				return err
			}
		}
		if err := model.CreateNewProperty(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.FontName]) == 0 {
		property := model.Property{
			Name:  guacd.FontName,
			Value: "menlo",
		}
		if err := model.CreateNewProperty(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.FontSize]) == 0 {
		property := model.Property{
			Name:  guacd.FontSize,
			Value: "12",
		}
		if err := model.CreateNewProperty(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.ColorScheme]) == 0 {
		property := model.Property{
			Name:  guacd.ColorScheme,
			Value: "gray-black",
		}
		if err := model.CreateNewProperty(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.EnableDrive]) == 0 {
		property := model.Property{
			Name:  guacd.EnableDrive,
			Value: "true",
		}
		if err := model.CreateNewProperty(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.EnableWallpaper]) == 0 {
		property := model.Property{
			Name:  guacd.EnableWallpaper,
			Value: "false",
		}
		if err := model.CreateNewProperty(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.EnableTheming]) == 0 {
		property := model.Property{
			Name:  guacd.EnableTheming,
			Value: "false",
		}
		if err := model.CreateNewProperty(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.EnableFontSmoothing]) == 0 {
		property := model.Property{
			Name:  guacd.EnableFontSmoothing,
			Value: "false",
		}
		if err := model.CreateNewProperty(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.EnableFullWindowDrag]) == 0 {
		property := model.Property{
			Name:  guacd.EnableFullWindowDrag,
			Value: "false",
		}
		if err := model.CreateNewProperty(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.EnableDesktopComposition]) == 0 {
		property := model.Property{
			Name:  guacd.EnableDesktopComposition,
			Value: "false",
		}
		if err := model.CreateNewProperty(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.EnableMenuAnimations]) == 0 {
		property := model.Property{
			Name:  guacd.EnableMenuAnimations,
			Value: "false",
		}
		if err := model.CreateNewProperty(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.DisableBitmapCaching]) == 0 {
		property := model.Property{
			Name:  guacd.DisableBitmapCaching,
			Value: "false",
		}
		if err := model.CreateNewProperty(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.DisableOffscreenCaching]) == 0 {
		property := model.Property{
			Name:  guacd.DisableOffscreenCaching,
			Value: "false",
		}
		if err := model.CreateNewProperty(&property); err != nil {
			return err
		}
	}

	if len(propertyMap[guacd.DisableGlyphCaching]) == 0 {
		property := model.Property{
			Name:  guacd.DisableGlyphCaching,
			Value: "false",
		}
		if err := model.CreateNewProperty(&property); err != nil {
			return err
		}
	}
	return nil
}
