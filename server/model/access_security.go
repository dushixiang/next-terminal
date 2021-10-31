package model

type AccessSecurity struct {
	ID       string `gorm:"primary_key,type:varchar(36)" json:"id"`
	Rule     string `gorm:"type:varchar(20)" json:"rule"`
	IP       string `gorm:"type:varchar(500)" json:"ip"`
	Source   string `gorm:"type:varchar(500)" json:"source"`
	Priority int64  `json:"priority"` // 越小优先级越高
}

func (r *AccessSecurity) TableName() string {
	return "access_securities"
}
