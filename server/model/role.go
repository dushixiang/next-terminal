package model

import (
	"next-terminal/server/common"
	"next-terminal/server/utils"
	"strings"
)

// Role 角色
type Role struct {
	ID         string          `gorm:"primary_key,type:varchar(36)" json:"id"`
	Name       string          `gorm:"type:varchar(500)" json:"name"`
	Type       string          `gorm:"type:varchar(10)" json:"type"`
	Deletable  bool            `json:"deletable"`
	Modifiable bool            `json:"modifiable"`
	Created    common.JsonTime `json:"created"`
	Menus      []RoleMenuRef   `gorm:"-" json:"menus"`
}

func (r *Role) TableName() string {
	return "roles"
}

func NewRole(id, name, _type string, deletable, modifiable bool, menus []RoleMenuRef) *Role {
	return &Role{
		ID:         id,
		Name:       name,
		Type:       _type,
		Deletable:  deletable,
		Modifiable: modifiable,
		Created:    common.NowJsonTime(),
		Menus:      menus,
	}
}

// Menu 菜单
type Menu struct {
	ID          string        `gorm:"primary_key,type:varchar(36)" json:"id"`
	Name        string        `gorm:"type:varchar(500)" json:"name"`
	ParentId    string        `gorm:"index,type:varchar(36)" json:"parentId"`
	Permissions []*Permission `gorm:"-"`
}

func NewMenu(id, name, parentId string, permissions ...*Permission) *Menu {
	return &Menu{
		ID:          id,
		Name:        name,
		ParentId:    parentId,
		Permissions: permissions,
	}
}

// Permission 权限
type Permission struct {
	ID             string `gorm:"primary_key,type:varchar(36)" json:"id"`
	Name           string `gorm:"type:varchar(500)" json:"name"`
	Method         string `gorm:"type:varchar(10)" json:"method"`
	Path           string `gorm:"type:varchar(200)" json:"path"`
	RequiredParams string `gorm:"type:varchar(200)" json:"params"`
}

func NewPermission(method, path string, requiredParams ...string) *Permission {
	return &Permission{
		ID:             utils.Sign([]string{method, path}),
		Method:         method,
		Path:           path,
		RequiredParams: strings.Join(requiredParams, ","),
	}
}

type RoleMenuRef struct {
	ID      string `gorm:"primary_key,type:varchar(36)" json:"id"`
	RoleId  string `gorm:"index,type:varchar(36)" json:"roleId"`
	MenuId  string `gorm:"index,type:varchar(36)" json:"menuId"`
	Checked bool   `json:"checked"`
}

func (r *RoleMenuRef) TableName() string {
	return "roles_menus_ref"
}

type UserRoleRef struct {
	ID     string `gorm:"primary_key,type:varchar(36)" json:"id"`
	UserId string `gorm:"index,type:varchar(36)" json:"userId"`
	RoleId string `gorm:"index,type:varchar(36)" json:"roleId"`
}

func (r *UserRoleRef) TableName() string {
	return "users_roles_ref"
}
