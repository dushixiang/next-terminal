package dto

import "next-terminal/server/common"

type StorageLogForPage struct {
	ID        string          `json:"id"`
	AssetId   string          `json:"assetId"`
	AssetName string          `json:"assetName"`
	SessionId string          `json:"sessionId"`
	UserId    string          `json:"userId"`
	UserName  string          `json:"userName"`
	Action    string          `json:"action"`   // 操作类型： 上传、下载、删除、重命名、编辑
	FileName  string          `json:"fileName"` // 文件名称
	Created   common.JsonTime `json:"created"`  // 操作时间
}
