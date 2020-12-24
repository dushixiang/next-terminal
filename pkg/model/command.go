package model

import (
	"next-terminal/pkg/global"
	"next-terminal/pkg/utils"
)

type Command struct {
	ID      string         `gorm:"primary_key" json:"id"`
	Name    string         `json:"name"`
	Content string         `json:"content"`
	Created utils.JsonTime `json:"created"`
}

func (r *Command) TableName() string {
	return "commands"
}

func FindPageCommand(pageIndex, pageSize int, name, content string) (o []Command, total int64, err error) {

	db := global.DB
	if len(name) > 0 {
		db = db.Where("name like ?", "%"+name+"%")
	}

	if len(content) > 0 {
		db = db.Where("content like ?", "%"+content+"%")
	}

	err = db.Find(&o).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Count(&total).Error
	if o == nil {
		o = make([]Command, 0)
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

func DeleteCommandById(id string) {
	global.DB.Where("id = ?", id).Delete(&Command{})
}
