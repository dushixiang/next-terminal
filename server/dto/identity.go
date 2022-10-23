package dto

import "next-terminal/server/common"

type UserGroup struct {
	Id      string            `json:"id"`
	Name    string            `json:"name"`
	Members []UserGroupMember `json:"members"`
	Created common.JsonTime   `json:"created"`
}

type UserGroupMember struct {
	Id   string `json:"id"`
	Name string `json:"name"`
}
