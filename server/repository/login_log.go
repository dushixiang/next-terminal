package repository

import (
	"time"

	"next-terminal/server/model"

	"gorm.io/gorm"
)

type LoginLogRepository struct {
	DB *gorm.DB
}

func NewLoginLogRepository(db *gorm.DB) *LoginLogRepository {
	loginLogRepository = &LoginLogRepository{DB: db}
	return loginLogRepository
}

func (r LoginLogRepository) Find(pageIndex, pageSize int, username, clientIp, state string) (o []model.LoginLog, total int64, err error) {
	m := model.LoginLog{}
	db := r.DB.Table(m.TableName())
	dbCounter := r.DB.Table(m.TableName())

	if username != "" {
		db = db.Where("username like ?", "%"+username+"%")
		dbCounter = dbCounter.Where("username like ?", "%"+username+"%")
	}

	if clientIp != "" {
		db = db.Where("client_ip like ?", "%"+clientIp+"%")
		dbCounter = dbCounter.Where("client_ip like ?", "%"+clientIp+"%")
	}

	if state != "" {
		db = db.Where("state = ?", state)
		dbCounter = dbCounter.Where("state = ?", state)
	}

	err = dbCounter.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	err = db.Order("login_time desc").Offset((pageIndex - 1) * pageSize).Limit(pageSize).Find(&o).Error
	if o == nil {
		o = make([]model.LoginLog, 0)
	}
	return
}

func (r LoginLogRepository) FindAliveLoginLogs() (o []model.LoginLog, err error) {
	err = r.DB.Where("state = '1' and logout_time is null").Find(&o).Error
	return
}

func (r LoginLogRepository) FindAllLoginLogs() (o []model.LoginLog, err error) {
	err = r.DB.Find(&o).Error
	return
}

func (r LoginLogRepository) FindAliveLoginLogsByUsername(username string) (o []model.LoginLog, err error) {
	err = r.DB.Where("state = '1' and logout_time is null and username = ?", username).Find(&o).Error
	return
}

func (r LoginLogRepository) FindOutTimeLog(dayLimit int) (o []model.LoginLog, err error) {
	limitTime := time.Now().Add(time.Duration(-dayLimit*24) * time.Hour)
	err = r.DB.Where("(state = '0' and login_time < ?) or (state = '1' and logout_time < ?) or (state is null and logout_time < ?)", limitTime, limitTime, limitTime).Find(&o).Error
	return
}

func (r LoginLogRepository) Create(o *model.LoginLog) (err error) {
	return r.DB.Create(o).Error
}

func (r LoginLogRepository) DeleteByIdIn(ids []string) (err error) {
	return r.DB.Where("id in ?", ids).Delete(&model.LoginLog{}).Error
}

func (r LoginLogRepository) DeleteById(id string) (err error) {
	return r.DB.Where("id = ?", id).Delete(&model.LoginLog{}).Error
}

func (r LoginLogRepository) FindById(id string) (o model.LoginLog, err error) {
	err = r.DB.Where("id = ?", id).First(&o).Error
	return
}

func (r LoginLogRepository) Update(o *model.LoginLog) error {
	return r.DB.Updates(o).Error
}
