package model

type Num struct {
	I string `gorm:"primary_key" json:"i"`
}

func (r *Num) TableName() string {
	return "nums"
}
