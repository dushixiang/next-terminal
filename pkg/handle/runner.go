package handle

import (
	"github.com/robfig/cron/v3"
	"github.com/sirupsen/logrus"
	"next-terminal/pkg/api"
	"next-terminal/pkg/global"
	"next-terminal/pkg/guacd"
	"next-terminal/pkg/model"
	"next-terminal/pkg/utils"
	"os"
	"strconv"
	"time"
)

func RunTicker() {

	c := cron.New(cron.WithSeconds()) //精确到秒

	_, _ = c.AddFunc("0 0 0/1 * * ?", func() {
		// 定时任务，每隔一小时删除一次未使用的会话信息
		sessions, _ := model.FindSessionByStatusIn([]string{model.NoConnect, model.Connecting})
		if sessions != nil && len(sessions) > 0 {
			now := time.Now()
			for i := range sessions {
				if now.Sub(sessions[i].ConnectedTime.Time) > time.Hour*1 {
					model.DeleteSessionById(sessions[i].ID)
					s := sessions[i].Username + "@" + sessions[i].IP + ":" + strconv.Itoa(sessions[i].Port)
					logrus.Infof("会话「%v」ID「%v」超过1小时未打开，已删除。", s, sessions[i].ID)
				}
			}
		}
		// 每隔一小时检测一次资产是否存活
		assets, _ := model.FindAllAsset()
		if assets != nil && len(assets) > 0 {
			for i := range assets {
				asset := assets[i]
				active := utils.Tcping(asset.IP, asset.Port)
				model.UpdateAssetActiveById(active, asset.ID)
				logrus.Infof("资产「%v」ID「%v」存活状态检测完成，存活「%v」。", asset.Name, asset.ID, active)
			}
		}
	})

	// 定时任务，每隔一分钟校验一次运行中的会话信息
	_, _ = c.AddFunc("0 0/1 0/1 * * ?", func() {
		sessions, _ := model.FindSessionByStatus(model.Connected)
		if sessions != nil && len(sessions) > 0 {
			for i := range sessions {
				_, found := global.Store.Get(sessions[i].ID)
				if !found {
					api.CloseSessionById(sessions[i].ID, api.Normal, "")
					s := sessions[i].Username + "@" + sessions[i].IP + ":" + strconv.Itoa(sessions[i].Port)
					logrus.Infof("会话「%v」ID「%v」已离线，修改状态为「关闭」。", s, sessions[i].ID)
				}
			}
		}
	})

	c.Start()
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
