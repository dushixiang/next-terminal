package model

import (
	"github.com/sirupsen/logrus"
	"next-terminal/pkg/global"
	"next-terminal/pkg/utils"
)

type LoginLog struct {
	ID              string         `gorm:"primary_key" json:"id"`
	UserId          string         `gorm:"index" json:"userId"`
	ClientIP        string         `json:"clientIp"`
	ClientUserAgent string         `json:"clientUserAgent"`
	LoginTime       utils.JsonTime `json:"loginTime"`
	LogoutTime      utils.JsonTime `json:"logoutTime"`
	Remember        bool           `json:"remember"`
}

type LoginLogVo struct {
	ID              string         `json:"id"`
	UserId          string         `json:"userId"`
	UserName        string         `json:"userName"`
	ClientIP        string         `json:"clientIp"`
	ClientUserAgent string         `json:"clientUserAgent"`
	LoginTime       utils.JsonTime `json:"loginTime"`
	LogoutTime      utils.JsonTime `json:"logoutTime"`
	Remember        bool           `json:"remember"`
}

func (r *LoginLog) TableName() string {
	return "login_logs"
}

func FindPageLoginLog(pageIndex, pageSize int, userId, clientIp string) (o []LoginLogVo, total int64, err error) {

	db := global.DB.Table("login_logs").Select("login_logs.id,login_logs.user_id,login_logs.client_ip,login_logs.client_user_agent,login_logs.login_time, login_logs.logout_time, users.nickname as user_name").Joins("left join users on login_logs.user_id = users.id")
	dbCounter := global.DB.Table("login_logs").Select("DISTINCT login_logs.id")

	if userId != "" {
		db = db.Where("login_logs.user_id = ?", userId)
		dbCounter = dbCounter.Where("login_logs.user_id = ?", userId)
	}

	if clientIp != "" {
		db = db.Where("login_logs.client_ip like ?", "%"+clientIp+"%")
		dbCounter = dbCounter.Where("login_logs.client_ip like ?", "%"+clientIp+"%")
	}

	err = dbCounter.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	err = db.Order("login_logs.login_time desc").Offset((pageIndex - 1) * pageSize).Limit(pageSize).Find(&o).Error
	if o == nil {
		o = make([]LoginLogVo, 0)
	}
	return
}

func FindAliveLoginLogs() (o []LoginLog, err error) {
	err = global.DB.Where("logout_time is null").Find(&o).Error
	return
}

func FindAliveLoginLogsByUserId(userId string) (o []LoginLog, err error) {
	err = global.DB.Where("logout_time is null and user_id = ?", userId).Find(&o).Error
	return
}

func CreateNewLoginLog(o *LoginLog) (err error) {
	return global.DB.Create(o).Error
}

func DeleteLoginLogByIdIn(ids []string) (err error) {
	return global.DB.Where("id in ?", ids).Delete(&LoginLog{}).Error
}

func FindLoginLogById(id string) (o LoginLog, err error) {
	err = global.DB.Where("id = ?", id).First(&o).Error
	return
}

func Logout(token string) (err error) {

	loginLog, err := FindLoginLogById(token)
	if err != nil {
		logrus.Warnf("登录日志「%v」获取失败", token)
		return
	}

	err = global.DB.Updates(&LoginLog{LogoutTime: utils.NowJsonTime(), ID: token}).Error
	if err != nil {
		return err
	}

	loginLogs, err := FindAliveLoginLogsByUserId(loginLog.UserId)
	if err != nil {
		return
	}

	if len(loginLogs) == 0 {
		err = UpdateUserOnline(false, loginLog.UserId)
	}
	return
}
