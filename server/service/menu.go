package service

import (
	"github.com/ucarion/urlpath"
	"next-terminal/server/dto"
	"next-terminal/server/model"
)

var MenuService = &menuService{}

type menuService struct {
	menuPermissions map[string][]*urlpath.Path
	treeMenus       []*dto.TreeMenu
}

func (s *menuService) Init() error {

	if s.menuPermissions == nil {
		s.menuPermissions = make(map[string][]*urlpath.Path)
	}
	// 重载权限路径
	for _, menu := range DefaultMenu {
		var permissions []*urlpath.Path
		for _, permission := range menu.Permissions {
			path := urlpath.New(permission.Path)
			permissions = append(permissions, &path)
		}
		s.menuPermissions[menu.ID] = permissions
	}

	// 重载菜单树缓存
	for _, menu := range DefaultMenu {
		if menu.ParentId == "root" {
			p := &dto.TreeMenu{
				Title:    menu.Name,
				Key:      menu.ID,
				Children: getChildren(DefaultMenu, menu.ID),
			}
			s.treeMenus = append(s.treeMenus, p)
		}
	}
	return nil
}

func getChildren(menus []*model.Menu, parentId string) []dto.TreeMenu {
	var children []dto.TreeMenu
	for _, menu := range menus {
		if menu.ParentId == parentId {
			p := dto.TreeMenu{
				Title:    menu.Name,
				Key:      menu.ID,
				Children: getChildren(DefaultMenu, menu.ID),
			}
			children = append(children, p)
		}
	}
	return children
}

func (s *menuService) GetPermissionByMenu(menu string) []*urlpath.Path {
	item, ok := s.menuPermissions[menu]
	if ok {
		return item
	}
	return nil
}

func (s *menuService) GetTreeMenus() []*dto.TreeMenu {
	return s.treeMenus
}

func (s *menuService) GetMenus() (items []string) {
	for _, menu := range DefaultMenu {
		items = append(items, menu.ID)
	}
	return items
}
