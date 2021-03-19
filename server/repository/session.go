package repository

import (
	"os"
	"path"
	"time"

	"next-terminal/server/constant"
	"next-terminal/server/model"

	"gorm.io/gorm"
)

type SessionRepository struct {
	DB *gorm.DB
}

func NewSessionRepository(db *gorm.DB) *SessionRepository {
	sessionRepository = &SessionRepository{DB: db}
	return sessionRepository
}

func (r SessionRepository) Find(pageIndex, pageSize int, status, userId, clientIp, assetId, protocol string) (results []model.SessionVo, total int64, err error) {

	db := r.DB
	var params []interface{}

	params = append(params, status)

	itemSql := "SELECT s.id,s.mode, s.protocol,s.recording, s.connection_id, s.asset_id, s.creator, s.client_ip, s.width, s.height, s.ip, s.port, s.username, s.status, s.connected_time, s.disconnected_time,s.code, s.message, a.name AS asset_name, u.nickname AS creator_name FROM sessions s LEFT JOIN assets a ON s.asset_id = a.id LEFT JOIN users u ON s.creator = u.id WHERE s.STATUS = ? "
	countSql := "select count(*) from sessions as s where s.status = ? "

	if len(userId) > 0 {
		itemSql += " and s.creator = ?"
		countSql += " and s.creator = ?"
		params = append(params, userId)
	}

	if len(clientIp) > 0 {
		itemSql += " and s.client_ip like ?"
		countSql += " and s.client_ip like ?"
		params = append(params, "%"+clientIp+"%")
	}

	if len(assetId) > 0 {
		itemSql += " and s.asset_id = ?"
		countSql += " and s.asset_id = ?"
		params = append(params, assetId)
	}

	if len(protocol) > 0 {
		itemSql += " and s.protocol = ?"
		countSql += " and s.protocol = ?"
		params = append(params, protocol)
	}

	params = append(params, (pageIndex-1)*pageSize, pageSize)
	itemSql += " order by s.connected_time desc LIMIT ?, ?"

	db.Raw(countSql, params...).Scan(&total)

	err = db.Raw(itemSql, params...).Scan(&results).Error

	if results == nil {
		results = make([]model.SessionVo, 0)
	}
	return
}

func (r SessionRepository) FindByStatus(status string) (o []model.Session, err error) {
	err = r.DB.Where("status = ?", status).Find(&o).Error
	return
}

func (r SessionRepository) FindByStatusIn(statuses []string) (o []model.Session, err error) {
	err = r.DB.Where("status in ?", statuses).Find(&o).Error
	return
}

func (r SessionRepository) FindOutTimeSessions(dayLimit int) (o []model.Session, err error) {
	limitTime := time.Now().Add(time.Duration(-dayLimit*24) * time.Hour)
	err = r.DB.Where("status = ? and connected_time < ?", constant.Disconnected, limitTime).Find(&o).Error
	return
}

func (r SessionRepository) Create(o *model.Session) (err error) {
	err = r.DB.Create(o).Error
	return
}

func (r SessionRepository) FindById(id string) (o model.Session, err error) {
	err = r.DB.Where("id = ?", id).First(&o).Error
	return
}

func (r SessionRepository) FindByConnectionId(connectionId string) (o model.Session, err error) {
	err = r.DB.Where("connection_id = ?", connectionId).First(&o).Error
	return
}

func (r SessionRepository) UpdateById(o *model.Session, id string) error {
	o.ID = id
	return r.DB.Updates(o).Error
}

func (r SessionRepository) UpdateWindowSizeById(width, height int, id string) error {
	session := model.Session{}
	session.Width = width
	session.Height = height

	return r.UpdateById(&session, id)
}

func (r SessionRepository) DeleteById(id string) error {
	return r.DB.Where("id = ?", id).Delete(&model.Session{}).Error
}

func (r SessionRepository) DeleteByIds(sessionIds []string) error {
	drivePath, err := propertyRepository.GetRecordingPath()
	if err != nil {
		return err
	}
	for i := range sessionIds {
		if err := os.RemoveAll(path.Join(drivePath, sessionIds[i])); err != nil {
			return err
		}
		if err := r.DeleteById(sessionIds[i]); err != nil {
			return err
		}
	}
	return nil
}

func (r SessionRepository) DeleteByStatus(status string) error {
	return r.DB.Where("status = ?", status).Delete(&model.Session{}).Error
}

func (r SessionRepository) CountOnlineSession() (total int64, err error) {
	err = r.DB.Where("status = ?", constant.Connected).Find(&model.Session{}).Count(&total).Error
	return
}

type D struct {
	Day      string `json:"day"`
	Count    int    `json:"count"`
	Protocol string `json:"protocol"`
}

func (r SessionRepository) CountSessionByDay(day int) (results []D, err error) {

	today := time.Now().Format("20060102")
	sql := "select t1.`day`, count(t2.id) as count\nfrom (\n         SELECT @date := DATE_ADD(@date, INTERVAL - 1 DAY) day\n         FROM (SELECT @date := DATE_ADD('" + today + "', INTERVAL + 1 DAY) FROM nums) as t0\n         LIMIT ?\n     )\n         as t1\n         left join\n     (\n         select DATE(s.connected_time) as day, s.id\n         from sessions as s\n         WHERE protocol = ? and DATE(connected_time) <= '" + today + "'\n           AND DATE(connected_time) > DATE_SUB('" + today + "', INTERVAL ? DAY)\n     ) as t2 on t1.day = t2.day\ngroup by t1.day"

	protocols := []string{"rdp", "ssh", "vnc", "telnet"}

	for i := range protocols {
		var result []D
		err = r.DB.Raw(sql, day, protocols[i], day).Scan(&result).Error
		if err != nil {
			return nil, err
		}
		for j := range result {
			result[j].Protocol = protocols[i]
		}
		results = append(results, result...)
	}

	return
}
