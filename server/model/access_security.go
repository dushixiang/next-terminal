package model

type AccessSecurity struct {
	ID       string `json:"id"`
	Rule     string `json:"rule"`
	IP       string `json:"ip"`
	Source   string `json:"source"`
	Priority int64  `json:"priority"` // 越小优先级越高
}

func (r *AccessSecurity) TableName() string {
	return "access_securities"
}
