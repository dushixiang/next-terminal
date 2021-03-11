package model

import (
	"next-terminal/pkg/constant"
	"next-terminal/pkg/global"
	"next-terminal/pkg/utils"
)

type Command struct {
	ID      string         `gorm:"primary_key" json:"id"`
	Name    string         `json:"name"`
	Content string         `json:"content"`
	Created utils.JsonTime `json:"created"`
	Owner   string         `gorm:"index" json:"owner"`
}

type CommandVo struct {
	ID          string         `gorm:"primary_key" json:"id"`
	Name        string         `json:"name"`
	Content     string         `json:"content"`
	Created     utils.JsonTime `json:"created"`
	Owner       string         `json:"owner"`
	OwnerName   string         `json:"ownerName"`
	SharerCount int64          `json:"sharerCount"`
}

func (r *Command) TableName() string {
	return "commands"
}

func FindPageCommand(pageIndex, pageSize int, name, content, order, field string, account User) (o []CommandVo, total int64, err error) {

	db := global.DB.Table("commands").Select("commands.id,commands.name,commands.content,commands.owner,commands.created, users.nickname as owner_name,COUNT(resource_sharers.user_id) as sharer_count").Joins("left join users on commands.owner = users.id").Joins("left join resource_sharers on commands.id = resource_sharers.resource_id").Group("commands.id")
	dbCounter := global.DB.Table("commands").Select("DISTINCT commands.id").Joins("left join resource_sharers on commands.id = resource_sharers.resource_id").Group("commands.id")

	if constant.TypeUser == account.Type {
		owner := account.ID
		db = db.Where("commands.owner = ? or resource_sharers.user_id = ?", owner, owner)
		dbCounter = dbCounter.Where("commands.owner = ? or resource_sharers.user_id = ?", owner, owner)
	}

	if len(name) > 0 {
		db = db.Where("commands.name like ?", "%"+name+"%")
		dbCounter = dbCounter.Where("commands.name like ?", "%"+name+"%")
	}

	if len(content) > 0 {
		db = db.Where("commands.content like ?", "%"+content+"%")
		dbCounter = dbCounter.Where("commands.content like ?", "%"+content+"%")
	}

	err = dbCounter.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	if order == "ascend" {
		order = "asc"
	} else {
		order = "desc"
	}

	if field == "name" {
		field = "name"
	} else {
		field = "created"
	}

	err = db.Order("commands." + field + " " + order).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Find(&o).Error
	if o == nil {
		o = make([]CommandVo, 0)
	}
	return
}

func CreateNewCommand(o *Command) (err error) {
	if err = global.DB.Create(o).Error; err != nil {
		return err
	}
	return nil
}

func FindCommandById(id string) (o Command, err error) {
	err = global.DB.Where("id = ?", id).First(&o).Error
	return
}

func UpdateCommandById(o *Command, id string) {
	o.ID = id
	global.DB.Updates(o)
}

func DeleteCommandById(id string) error {
	return global.DB.Where("id = ?", id).Delete(&Command{}).Error
}
