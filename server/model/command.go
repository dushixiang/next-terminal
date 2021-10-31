package model

import (
	"next-terminal/server/utils"
)

type Command struct {
	ID      string         `gorm:"primary_key,type:varchar(36)" json:"id"`
	Name    string         `gorm:"type:varchar(500)" json:"name"`
	Content string         `json:"content"`
	Created utils.JsonTime `json:"created"`
	Owner   string         `gorm:"index,type:varchar(36)" json:"owner"`
}

type CommandForPage struct {
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
