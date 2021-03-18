package repository

import (
	"gorm.io/gorm"
	"next-terminal/server/model"
)

type LoginLogRepository struct {
	DB *gorm.DB
}

func NewLoginLogRepository(db *gorm.DB) *LoginLogRepository {
	loginLogRepository = &LoginLogRepository{DB: db}
	return loginLogRepository
}

func (r LoginLogRepository) Find(pageIndex, pageSize int, userId, clientIp string) (o []model.LoginLogVo, total int64, err error) {

	db := r.DB.Table("login_logs").Select("login_logs.id,login_logs.user_id,login_logs.client_ip,login_logs.client_user_agent,login_logs.login_time, login_logs.logout_time, users.nickname as user_name").Joins("left join users on login_logs.user_id = users.id")
	dbCounter := r.DB.Table("login_logs").Select("DISTINCT login_logs.id")

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
		o = make([]model.LoginLogVo, 0)
	}
	return
}

func (r LoginLogRepository) FindAliveLoginLogs() (o []model.LoginLog, err error) {
	err = r.DB.Where("logout_time is null").Find(&o).Error
	return
}

func (r LoginLogRepository) FindAliveLoginLogsByUserId(userId string) (o []model.LoginLog, err error) {
	err = r.DB.Where("logout_time is null and user_id = ?", userId).Find(&o).Error
	return
}

func (r LoginLogRepository) Create(o *model.LoginLog) (err error) {
	return r.DB.Create(o).Error
}

func (r LoginLogRepository) DeleteByIdIn(ids []string) (err error) {
	return r.DB.Where("id in ?", ids).Delete(&model.LoginLog{}).Error
}

func (r LoginLogRepository) FindById(id string) (o model.LoginLog, err error) {
	err = r.DB.Where("id = ?", id).First(&o).Error
	return
}

func (r LoginLogRepository) Update(o *model.LoginLog) error {
	return r.DB.Updates(o).Error
}
