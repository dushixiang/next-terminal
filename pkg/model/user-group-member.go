package model

type UserGroupMember struct {
	ID          string `gorm:"primary_key" json:"name"`
	UserId      string `json:"userId"`
	UserGroupId string `json:"userGroupId"`
}

func (r *UserGroupMember) TableName() string {
	return "user_group_members"
}
