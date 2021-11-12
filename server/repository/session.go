package repository

import (
	"encoding/base64"
	"os"
	"path"
	"time"

	"next-terminal/server/config"
	"next-terminal/server/constant"
	"next-terminal/server/model"
	"next-terminal/server/utils"

	"gorm.io/gorm"
)

type SessionRepository struct {
	DB *gorm.DB
}

func NewSessionRepository(db *gorm.DB) *SessionRepository {
	sessionRepository = &SessionRepository{DB: db}
	return sessionRepository
}

func (r SessionRepository) Find(pageIndex, pageSize int, status, userId, clientIp, assetId, protocol, reviewed string) (results []model.SessionForPage, total int64, err error) {

	db := r.DB
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

func (r SessionRepository) FindByIdAndDecrypt(id string) (o model.Session, err error) {
	err = r.DB.Where("id = ?", id).First(&o).Error
	if err == nil {
		err = r.Decrypt(&o)
	}
	return
}

func (r SessionRepository) Decrypt(item *model.Session) error {
	if item.Password != "" && item.Password != "-" {
		origData, err := base64.StdEncoding.DecodeString(item.Password)
		if err != nil {
			return err
		}
		decryptedCBC, err := utils.AesDecryptCBC(origData, config.GlobalCfg.EncryptionPassword)
		if err != nil {
			return err
		}
		item.Password = string(decryptedCBC)
	}
	if item.PrivateKey != "" && item.PrivateKey != "-" {
		origData, err := base64.StdEncoding.DecodeString(item.PrivateKey)
		if err != nil {
			return err
		}
		decryptedCBC, err := utils.AesDecryptCBC(origData, config.GlobalCfg.EncryptionPassword)
		if err != nil {
			return err
		}
		item.PrivateKey = string(decryptedCBC)
	}
	if item.Passphrase != "" && item.Passphrase != "-" {
		origData, err := base64.StdEncoding.DecodeString(item.Passphrase)
		if err != nil {
			return err
		}
		decryptedCBC, err := utils.AesDecryptCBC(origData, config.GlobalCfg.EncryptionPassword)
		if err != nil {
			return err
		}
		item.Passphrase = string(decryptedCBC)
	}
	return nil
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
	recordingPath := config.GlobalCfg.Guacd.Recording
	for i := range sessionIds {
		if err := os.RemoveAll(path.Join(recordingPath, sessionIds[i])); err != nil {
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

func (r SessionRepository) EmptyPassword() error {
	sql := "update sessions set password = '-',private_key = '-', passphrase = '-' where 1=1"
	return r.DB.Exec(sql).Error
}

func (r SessionRepository) CountByStatus(status string) (total int64, err error) {
	err = r.DB.Find(&model.Session{}).Where("status = ?", status).Count(&total).Error
	return
}

func (r SessionRepository) OverviewAccess(account model.User) (o []model.SessionForAccess, err error) {
	db := r.DB
	if constant.TypeUser == account.Type {
		sql := "SELECT s.asset_id, s.ip, s.port, s.protocol, s.username, count(s.asset_id) AS access_count FROM sessions AS s where s.creator = ? GROUP BY s.asset_id, s.ip, s.port, s.protocol, s.username ORDER BY access_count DESC limit 10"
		err = db.Raw(sql, []string{account.ID}).Scan(&o).Error
	} else {
		sql := "SELECT s.asset_id, s.ip, s.port, s.protocol, s.username, count(s.asset_id) AS access_count FROM sessions AS s GROUP BY s.asset_id, s.ip, s.port, s.protocol, s.username ORDER BY access_count DESC limit 10"
		err = db.Raw(sql).Scan(&o).Error
	}
	if o == nil {
		o = make([]model.SessionForAccess, 0)
	}
	return
}

func (r SessionRepository) UpdateReadByIds(reviewed bool, ids []string) error {
	sql := "update sessions set reviewed = ? where id in ?"
	return r.DB.Exec(sql, reviewed, ids).Error
}

func (r SessionRepository) FindAllUnReviewed() (o []model.Session, err error) {
	err = r.DB.Where("reviewed = false or reviewed is null").Find(&o).Error
	return
}
