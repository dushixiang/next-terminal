package model

import "next-terminal/server/common"

// Authorised 资产授权
type Authorised struct {
	ID              string          `gorm:"primary_key,type:varchar(36)" json:"id"`
	AssetId         string          `gorm:"index,type:varchar(36)" json:"assetId"`
	CommandFilterId string          `gorm:"index,type:varchar(36)" json:"commandFilterId"`
	StrategyId      string          `gorm:"index,type:varchar(36)" json:"strategyId"`
	UserId          string          `gorm:"index,type:varchar(36)" json:"userId"`
	UserGroupId     string          `gorm:"index,type:varchar(36)" json:"userGroupId"`
	Created         common.JsonTime `json:"created"`
}

func (m Authorised) TableName() string {
	return "authorised"
}
