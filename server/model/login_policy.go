package model

type LoginPolicy struct {
	ID         string       `gorm:"primary_key,type:varchar(36)" json:"id"`
	Name       string       `gorm:"type:varchar(500)" json:"name"` // 名称
	IpGroup    string       `json:"ipGroup"`                       // IP组 格式为逗号分隔的字符串, 0.0.0.0 匹配所有。例如: 192.168.0.1, 192.168.1.0/24, 192.168.2.0-192.168.2.20
	Priority   int64        `json:"priority"`                      // 优先级 越小优先级越高
	Enabled    bool         `json:"enabled"`                       // 是否激活
	Rule       string       `gorm:"type:varchar(20)" json:"rule"`  // 规则 允许或拒绝
	TimePeriod []TimePeriod `gorm:"-" json:"timePeriod"`           // 时间区间
}

func (r *LoginPolicy) TableName() string {
	return "login_policies"
}

type LoginPolicyUserRef struct {
	ID            string `gorm:"primary_key,type:varchar(36)" json:"id"`
	UserId        string `gorm:"index,type:varchar(36)" json:"userId"`
	LoginPolicyId string `gorm:"index,type:varchar(36)" json:"loginPolicyId"`
}

func (r *LoginPolicyUserRef) TableName() string {
	return "login_policies_ref"
}

type TimePeriod struct {
	ID            string `gorm:"primary_key,type:varchar(36)" json:"id"`
	LoginPolicyId string `gorm:"index,type:varchar(36)" json:"loginPolicyId"`
	Key           int    `json:"key"`
	Value         string `json:"value"`
}

func (r *TimePeriod) TableName() string {
	return "time_periods"
}
