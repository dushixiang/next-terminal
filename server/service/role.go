package service

import (
	"context"
	"errors"
	"sync"

	"next-terminal/server/common/sets"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"
)

var RoleService = new(roleService)

type roleService struct {
	baseService
	roleMenus sync.Map
}

func (s *roleService) Init() error {
	ctx := context.Background()
	// 创建默认的角色
	if err := s.CreateDefaultRoles(); err != nil {
		return err
	}

	// 重载角色对应权限的缓存
	roles, err := repository.RoleRepository.FindAll(ctx)
	if err != nil {
		return err
	}
	for _, role := range roles {
		refs, err := s.FindMenuByRoleId(ctx, role.ID)
		if err != nil {
			return err
		}
		var menus []string
		for _, ref := range refs {
			menus = append(menus, ref.MenuId)
		}
		s.setRoleMenus(role.ID, menus)
	}
	return nil
}

func (s *roleService) mapRoleMenus(keys []string) []model.RoleMenuRef {
	var roleMenus []model.RoleMenuRef
	for _, key := range keys {
		roleMenus = append(roleMenus, model.RoleMenuRef{
			MenuId:  key,
			Checked: true,
		})
	}
	return roleMenus
}

func (s *roleService) Create(c context.Context, role *model.Role) error {
	return s.Transaction(c, func(ctx context.Context) error {
		if err := repository.RoleRepository.Create(ctx, role); err != nil {
			return err
		}
		if err := s.createRolePermissionRefs(ctx, role); err != nil {
			return err
		}
		return nil
	})
}

func (s *roleService) createRolePermissionRefs(ctx context.Context, role *model.Role) error {
	var menuIds = sets.NewStringSet()
	var refIds = sets.NewStringSet()
	var refs []*model.RoleMenuRef
	for _, menu := range role.Menus {
		refId := utils.Sign([]string{role.ID, menu.MenuId})
		if refIds.Contains(refId) {
			continue
		}
		ref := &model.RoleMenuRef{
			ID:      refId,
			RoleId:  role.ID,
			MenuId:  menu.MenuId,
			Checked: menu.Checked,
		}
		refs = append(refs, ref)
		refIds.Add(ref.ID)
		menuIds.Add(menu.MenuId)
	}
	if err := repository.RoleMenuRefRepository.DeleteByIdIn(ctx, refIds.ToArray()); err != nil {
		return err
	}
	if err := repository.RoleMenuRefRepository.CreateInBatches(ctx, refs); err != nil {
		return err
	}
	s.setRoleMenus(role.ID, menuIds.ToArray())
	return nil
}

func (s *roleService) UpdateById(c context.Context, role *model.Role, id string, force bool) error {
	return s.Transaction(c, func(ctx context.Context) error {
		dbRole, err := repository.RoleRepository.FindById(ctx, id)
		if err != nil {
			return err
		}
		if !force {
			if !dbRole.Modifiable {
				return errors.New("prohibit to modify " + dbRole.Name)
			}
		}

		if err := repository.RoleRepository.UpdateById(ctx, role, id); err != nil {
			return err
		}
		if err := repository.RoleMenuRefRepository.DeleteByRoleId(ctx, id); err != nil {
			return err
		}
		if err := s.createRolePermissionRefs(ctx, role); err != nil {
			return err
		}
		return nil
	})
}

func (s *roleService) DeleteByIds(c context.Context, ids []string, force bool) error {
	return s.Transaction(c, func(ctx context.Context) error {
		for i := range ids {
			id := ids[i]
			if !force {
				role, err := repository.RoleRepository.FindById(ctx, id)
				if err != nil {
					return err
				}
				if !role.Deletable {
					return errors.New("prohibit to delete " + role.Name)
				}
			}

			if err := repository.RoleRepository.DeleteById(ctx, id); err != nil {
				return err
			}
			if err := repository.RoleMenuRefRepository.DeleteByRoleId(ctx, id); err != nil {
				return err
			}
			if err := repository.UserRoleRefRepository.DeleteByRoleId(ctx, id); err != nil {
				return err
			}
			// 删除缓存
			s.removeRole(id)
		}
		return nil
	})
}

func (s *roleService) FindById(ctx context.Context, id string) (*model.Role, error) {
	role, err := repository.RoleRepository.FindById(ctx, id)
	if err != nil {
		return nil, err
	}
	permissions, err := s.FindMenuByRoleId(ctx, id)
	if err != nil {
		return nil, err
	}
	for i := range permissions {
		permissions[i].ID = ""
		permissions[i].RoleId = ""
	}
	role.Menus = permissions
	return &role, nil
}

func (s *roleService) FindMenuByRoleId(ctx context.Context, id string) ([]model.RoleMenuRef, error) {
	refs, err := repository.RoleMenuRefRepository.FindByRoleId(ctx, id)
	if err != nil {
		return nil, err
	}
	return refs, nil
}

func (s *roleService) GetRolesByUserId(userId string) ([]string, error) {
	refs, err := repository.UserRoleRefRepository.FindByUserId(context.Background(), userId)
	if err != nil {
		return nil, err
	}

	var roles []string
	for _, ref := range refs {
		roles = append(roles, ref.RoleId)
	}
	return roles, nil
}

func (s *roleService) GetMenuListByRole(role string) []string {
	value, ok := s.roleMenus.Load(role)
	if ok {
		return value.([]string)
	}
	return nil
}

func (s *roleService) setRoleMenus(role string, items []string) {
	s.roleMenus.Store(role, items)
}

func (s *roleService) removeRole(role string) {
	s.roleMenus.Delete(role)
}

func (s *roleService) CreateDefaultRoles() error {
	var menus []string
	for _, menu := range DefaultMenu {
		menus = append(menus, menu.ID)
	}

	var auditPermissions = []string{
		"dashboard",
		"log-audit",
		"online-session",
		"offline-session",
		"login-log",
		"online-session-paging",
		"online-session-disconnect",
		"online-session-monitor",
		"offline-session-paging",
		"offline-session-playback",
		"offline-session-del",
		"offline-session-clear",
		"offline-session-reviewed",
		"offline-session-unreviewed",
		"offline-session-reviewed-all",
		"login-log-paging",
		"login-log-del",
		"login-log-clear",
	}

	var securityPermissions = []string{
		"security",
		"access-security-paging",
		"access-security-add",
		"access-security-edit",
		"access-security-del",
	}

	var DefaultRoles = []*model.Role{

		model.NewRole("system-administrator", "系统管理员", "default", false, false, s.mapRoleMenus(menus)),
		model.NewRole("audit-administrator", "审计管理员", "default", false, false, s.mapRoleMenus(auditPermissions)),
		model.NewRole("security-administrator", "安全管理员", "default", false, false, s.mapRoleMenus(securityPermissions)),
	}

	ctx := context.Background()

	for _, role := range DefaultRoles {
		exists, err := repository.RoleRepository.ExistsById(ctx, role.ID)
		if err != nil {
			return err
		}
		if exists {
			if err := s.UpdateById(ctx, role, role.ID, true); err != nil {
				return err
			}
			continue
		}
		if err := s.Create(ctx, role); err != nil {
			return err
		}
	}
	return nil
}
