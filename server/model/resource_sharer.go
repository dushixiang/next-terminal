package model

type ResourceSharer struct {
	ID           string `gorm:"primary_key,type:varchar(36)" json:"id"`
	ResourceId   string `gorm:"index,type:varchar(36)" json:"resourceId"`
	ResourceType string `gorm:"index,type:varchar(36)" json:"resourceType"`
	StrategyId   string `gorm:"index,type:varchar(36)" json:"strategyId"`
	UserId       string `gorm:"index,type:varchar(36)" json:"userId"`
	UserGroupId  string `gorm:"index,type:varchar(36)" json:"userGroupId"`
}

func (r *ResourceSharer) TableName() string {
	return "resource_sharers"
}
