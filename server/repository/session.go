package repository

import (
	"context"
	"os"
	"path"
	"time"

	"next-terminal/server/config"
	"next-terminal/server/constant"
	"next-terminal/server/model"
)

type sessionRepository struct {
	baseRepository
}

func (r sessionRepository) Find(c context.Context, pageIndex, pageSize int, status, userId, clientIp, assetId, protocol, reviewed string) (results []model.SessionForPage, total int64, err error) {

	db := r.GetDB(c)
	var params []interface{}

	params = append(params, status)

	itemSql := "SELECT s.id,s.mode, s.protocol,s.recording, s.connection_id, s.asset_id, s.creator, s.client_ip, s.width, s.height, s.ip, s.port, s.username, s.status, s.connected_time, s.disconnected_time,s.code,s.reviewed, s.message, a.name AS asset_name, u.nickname AS creator_name FROM sessions s LEFT JOIN assets a ON s.asset_id = a.id LEFT JOIN users u ON s.creator = u.id WHERE s.STATUS = ? "
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

	if reviewed != "" {
		bReviewed := reviewed == "true"
		itemSql += " and s.reviewed = ?"
		countSql += " and s.reviewed = ?"
		params = append(params, bReviewed)
	}

	params = append(params, (pageIndex-1)*pageSize, pageSize)
	itemSql += " order by s.connected_time desc LIMIT ?, ?"

	db.Raw(countSql, params...).Scan(&total)

	err = db.Raw(itemSql, params...).Scan(&results).Error

	if results == nil {
		results = make([]model.SessionForPage, 0)
	}
	return
}

func (r sessionRepository) FindByStatus(c context.Context, status string) (o []model.Session, err error) {
	err = r.GetDB(c).Where("status = ?", status).Find(&o).Error
	return
}

func (r sessionRepository) FindByStatusIn(c context.Context, statuses []string) (o []model.Session, err error) {
	err = r.GetDB(c).Where("status in ?", statuses).Find(&o).Error
	return
}

func (r sessionRepository) FindOutTimeSessions(c context.Context, dayLimit int) (o []model.Session, err error) {
	limitTime := time.Now().Add(time.Duration(-dayLimit*24) * time.Hour)
	err = r.GetDB(c).Where("status = ? and connected_time < ?", constant.Disconnected, limitTime).Find(&o).Error
	return
}

func (r sessionRepository) Create(c context.Context, o *model.Session) (err error) {
	err = r.GetDB(c).Create(o).Error
	return
}

func (r sessionRepository) FindById(c context.Context, id string) (o model.Session, err error) {
	err = r.GetDB(c).Where("id = ?", id).First(&o).Error
	return
}

func (r sessionRepository) FindByConnectionId(c context.Context, connectionId string) (o model.Session, err error) {
	err = r.GetDB(c).Where("connection_id = ?", connectionId).First(&o).Error
	return
}

func (r sessionRepository) UpdateById(c context.Context, o *model.Session, id string) error {
	o.ID = id
	return r.GetDB(c).Updates(o).Error
}

func (r sessionRepository) UpdateWindowSizeById(c context.Context, width, height int, id string) error {
	session := model.Session{}
	session.Width = width
	session.Height = height

	return r.UpdateById(c, &session, id)
}

func (r sessionRepository) DeleteById(c context.Context, id string) error {
	return r.GetDB(c).Where("id = ?", id).Delete(&model.Session{}).Error
}

func (r sessionRepository) DeleteByIds(c context.Context, sessionIds []string) error {
	recordingPath := config.GlobalCfg.Guacd.Recording
	for i := range sessionIds {
		if err := os.RemoveAll(path.Join(recordingPath, sessionIds[i])); err != nil {
			return err
		}
		if err := r.DeleteById(c, sessionIds[i]); err != nil {
			return err
		}
	}
	return nil
}

func (r sessionRepository) DeleteByStatus(c context.Context, status string) error {
	return r.GetDB(c).Where("status = ?", status).Delete(&model.Session{}).Error
}

func (r sessionRepository) CountOnlineSession(c context.Context) (total int64, err error) {
	err = r.GetDB(c).Where("status = ?", constant.Connected).Find(&model.Session{}).Count(&total).Error
	return
}

func (r sessionRepository) EmptyPassword(c context.Context) error {
	sql := "update sessions set password = '-',private_key = '-', passphrase = '-' where 1=1"
	return r.GetDB(c).Exec(sql).Error
}

func (r sessionRepository) CountByStatus(c context.Context, status string) (total int64, err error) {
	err = r.GetDB(c).Find(&model.Session{}).Where("status = ?", status).Count(&total).Error
	return
}

func (r sessionRepository) OverviewAccess(c context.Context) (o []model.SessionForAccess, err error) {
	db := r.GetDB(c)
	sql := "SELECT s.asset_id, s.ip, s.port, s.protocol, s.username, count(s.asset_id) AS access_count FROM sessions AS s GROUP BY s.asset_id, s.ip, s.port, s.protocol, s.username ORDER BY access_count DESC limit 10"
	err = db.Raw(sql).Scan(&o).Error
	if o == nil {
		o = make([]model.SessionForAccess, 0)
	}
	return
}

func (r sessionRepository) UpdateReadByIds(c context.Context, reviewed bool, ids []string) error {
	sql := "update sessions set reviewed = ? where id in ?"
	return r.GetDB(c).Exec(sql, reviewed, ids).Error
}

func (r sessionRepository) FindAllUnReviewed(c context.Context) (o []model.Session, err error) {
	err = r.GetDB(c).Where("reviewed = false or reviewed is null").Find(&o).Error
	return
}

func (r sessionRepository) UpdateMode(c context.Context) error {
	sql := "update sessions set mode = 'native' where mode = 'naive'"
	return r.GetDB(c).Exec(sql).Error
}
