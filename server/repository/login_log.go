package repository

import (
	"context"
	"time"

	"next-terminal/server/model"
)

type loginLogRepository struct {
	baseRepository
}

func (r loginLogRepository) Find(c context.Context, pageIndex, pageSize int, username, clientIp, state string) (o []model.LoginLog, total int64, err error) {
	m := model.LoginLog{}
	db := r.GetDB(c).Table(m.TableName())
	dbCounter := r.GetDB(c).Table(m.TableName())

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

func (r loginLogRepository) FindAliveLoginLogs(c context.Context) (o []model.LoginLog, err error) {
	err = r.GetDB(c).Where("state = '1' and logout_time is null").Find(&o).Error
	return
}

func (r loginLogRepository) FindAllLoginLogs(c context.Context) (o []model.LoginLog, err error) {
	err = r.GetDB(c).Find(&o).Error
	return
}

func (r loginLogRepository) FindAliveLoginLogsByUsername(c context.Context, username string) (o []model.LoginLog, err error) {
	err = r.GetDB(c).Where("state = '1' and logout_time is null and username = ?", username).Find(&o).Error
	return
}

func (r loginLogRepository) FindOutTimeLog(c context.Context, dayLimit int) (o []model.LoginLog, err error) {
	limitTime := time.Now().Add(time.Duration(-dayLimit*24) * time.Hour)
	err = r.GetDB(c).Where("(state = '0' and login_time < ?) or (state = '1' and logout_time < ?) or (state is null and logout_time < ?)", limitTime, limitTime, limitTime).Find(&o).Error
	return
}

func (r loginLogRepository) Create(c context.Context, o *model.LoginLog) (err error) {
	return r.GetDB(c).Create(o).Error
}

func (r loginLogRepository) DeleteByIdIn(c context.Context, ids []string) (err error) {
	return r.GetDB(c).Where("id in ?", ids).Delete(&model.LoginLog{}).Error
}

func (r loginLogRepository) DeleteById(c context.Context, id string) (err error) {
	return r.GetDB(c).Where("id = ?", id).Delete(&model.LoginLog{}).Error
}

func (r loginLogRepository) FindById(c context.Context, id string) (o model.LoginLog, err error) {
	err = r.GetDB(c).Where("id = ?", id).First(&o).Error
	return
}

func (r loginLogRepository) Update(c context.Context, o *model.LoginLog) error {
	return r.GetDB(c).Updates(o).Error
}
