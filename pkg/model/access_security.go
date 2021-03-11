package model

import (
	"next-terminal/pkg/global"
)

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

func FindAllAccessSecurities() (o []AccessSecurity, err error) {
	db := global.DB
	err = db.Order("priority asc").Find(&o).Error
	return
}

func FindPageSecurity(pageIndex, pageSize int, ip, rule, order, field string) (o []AccessSecurity, total int64, err error) {
	t := AccessSecurity{}
	db := global.DB.Table(t.TableName())
	dbCounter := global.DB.Table(t.TableName())

	if len(ip) > 0 {
		db = db.Where("ip like ?", "%"+ip+"%")
		dbCounter = dbCounter.Where("ip like ?", "%"+ip+"%")
	}

	if len(rule) > 0 {
		db = db.Where("rule = ?", rule)
		dbCounter = dbCounter.Where("rule = ?", rule)
	}

	err = dbCounter.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	if order == "descend" {
		order = "desc"
	} else {
		order = "asc"
	}

	if field == "ip" {
		field = "ip"
	} else if field == "rule" {
		field = "rule"
	} else {
		field = "priority"
	}

	err = db.Order(field + " " + order).Find(&o).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Error
	if o == nil {
		o = make([]AccessSecurity, 0)
	}
	return
}

func CreateNewSecurity(o *AccessSecurity) error {
	return global.DB.Create(o).Error
}

func UpdateSecurityById(o *AccessSecurity, id string) error {
	o.ID = id
	return global.DB.Updates(o).Error
}

func DeleteSecurityById(id string) error {

	return global.DB.Where("id = ?", id).Delete(AccessSecurity{}).Error
}

func FindSecurityById(id string) (o *AccessSecurity, err error) {
	err = global.DB.Where("id = ?", id).First(&o).Error
	return
}
