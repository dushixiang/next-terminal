package model

import (
	"next-terminal/pkg/global"
	"next-terminal/pkg/utils"
	"time"
)

const (
	NoConnect    = "no_connect"
	Connecting   = "connecting"
	Connected    = "connected"
	Disconnected = "disconnected"
)

const (
	Guacd = "guacd"
	Naive = "naive"
)

type Session struct {
	ID               string         `gorm:"primary_key" json:"id"`
	Protocol         string         `json:"protocol"`
	IP               string         `json:"ip"`
	Port             int            `json:"port"`
	ConnectionId     string         `json:"connectionId"`
	AssetId          string         `gorm:"index" json:"assetId"`
	Username         string         `json:"username"`
	Password         string         `json:"password"`
	Creator          string         `gorm:"index" json:"creator"`
	ClientIP         string         `json:"clientIp"`
	Width            int            `json:"width"`
	Height           int            `json:"height"`
	Status           string         `gorm:"index" json:"status"`
	Recording        string         `json:"recording"`
	PrivateKey       string         `json:"privateKey"`
	Passphrase       string         `json:"passphrase"`
	Code             int            `json:"code"`
	Message          string         `json:"message"`
	ConnectedTime    utils.JsonTime `json:"connectedTime"`
	DisconnectedTime utils.JsonTime `json:"disconnectedTime"`
	Mode             string         `json:"mode"`
}

func (r *Session) TableName() string {
	return "sessions"
}

type SessionVo struct {
	ID               string         `json:"id"`
	Protocol         string         `json:"protocol"`
	IP               string         `json:"ip"`
	Port             int            `json:"port"`
	Username         string         `json:"username"`
	ConnectionId     string         `json:"connectionId"`
	AssetId          string         `json:"assetId"`
	Creator          string         `json:"creator"`
	ClientIP         string         `json:"clientIp"`
	Width            int            `json:"width"`
	Height           int            `json:"height"`
	Status           string         `json:"status"`
	Recording        string         `json:"recording"`
	ConnectedTime    utils.JsonTime `json:"connectedTime"`
	DisconnectedTime utils.JsonTime `json:"disconnectedTime"`
	AssetName        string         `json:"assetName"`
	CreatorName      string         `json:"creatorName"`
	Code             int            `json:"code"`
	Message          string         `json:"message"`
	Mode             string         `json:"mode"`
}

func FindPageSession(pageIndex, pageSize int, status, userId, clientIp, assetId, protocol string) (results []SessionVo, total int64, err error) {

	db := global.DB
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
		results = make([]SessionVo, 0)
	}
	return
}

func FindSessionByStatus(status string) (o []Session, err error) {
	err = global.DB.Where("status = ?", status).Find(&o).Error
	return
}

func FindSessionByStatusIn(statuses []string) (o []Session, err error) {
	err = global.DB.Where("status in ?", statuses).Find(&o).Error
	return
}

func CreateNewSession(o *Session) (err error) {
	err = global.DB.Create(o).Error
	return
}

func FindSessionById(id string) (o Session, err error) {
	err = global.DB.Where("id = ?", id).First(&o).Error
	return
}

func FindSessionByConnectionId(connectionId string) (o Session, err error) {
	err = global.DB.Where("connection_id = ?", connectionId).First(&o).Error
	return
}

func UpdateSessionById(o *Session, id string) error {
	o.ID = id
	return global.DB.Updates(o).Error
}

func UpdateSessionWindowSizeById(width, height int, id string) error {
	session := Session{}
	session.Width = width
	session.Height = height

	return UpdateSessionById(&session, id)
}

func DeleteSessionById(id string) {
	global.DB.Where("id = ?", id).Delete(&Session{})
}

func DeleteSessionByStatus(status string) {
	global.DB.Where("status = ?", status).Delete(&Session{})
}

func CountOnlineSession() (total int64, err error) {
	err = global.DB.Where("status = ?", Connected).Find(&Session{}).Count(&total).Error
	return
}

type D struct {
	Day      string `json:"day"`
	Count    int    `json:"count"`
	Protocol string `json:"protocol"`
}

func CountSessionByDay(day int) (results []D, err error) {

	today := time.Now().Format("20060102")
	sql := "select t1.`day`, count(t2.id) as count\nfrom (\n         SELECT @date := DATE_ADD(@date, INTERVAL - 1 DAY) day\n         FROM (SELECT @date := DATE_ADD('" + today + "', INTERVAL + 1 DAY) FROM nums) as t0\n         LIMIT ?\n     )\n         as t1\n         left join\n     (\n         select DATE(s.connected_time) as day, s.id\n         from sessions as s\n         WHERE protocol = ? and DATE(connected_time) <= '" + today + "'\n           AND DATE(connected_time) > DATE_SUB('" + today + "', INTERVAL ? DAY)\n     ) as t2 on t1.day = t2.day\ngroup by t1.day"

	protocols := []string{"rdp", "ssh", "vnc", "telnet"}

	for i := range protocols {
		var result []D
		err = global.DB.Raw(sql, day, protocols[i], day).Scan(&result).Error
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
