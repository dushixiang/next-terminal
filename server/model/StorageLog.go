package model

import "next-terminal/server/common"

type StorageLog struct {
	ID        string          `gorm:"primary_key,type:varchar(36)" json:"id"`
	AssetId   string          `gorm:"index,type:varchar(36)"  json:"assetId"`
	SessionId string          `gorm:"index,type:varchar(36)"  json:"sessionId"`
	UserId    string          `gorm:"index,type:varchar(36)"  json:"userId"`
	Action    string          `gorm:"type:varchar(20)" json:"action"`    // 操作类型： 上传、下载、删除、重命名、编辑
	FileName  string          `gorm:"type:varchar(200)" json:"fileName"` // 文件名称
	Created   common.JsonTime `json:"created"`                           // 操作时间
}

func (s StorageLog) TableName() string {
	return "storage_logs"
}
