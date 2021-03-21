package model

type ResourceSharer struct {
	ID           string `gorm:"primary_key" json:"id"`
	ResourceId   string `gorm:"index" json:"resourceId"`
	ResourceType string `gorm:"index" json:"resourceType"`
	UserId       string `gorm:"index" json:"userId"`
	UserGroupId  string `gorm:"index" json:"userGroupId"`
}

func (r *ResourceSharer) TableName() string {
	return "resource_sharers"
}
