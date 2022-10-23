package service

import (
	"context"

	"next-terminal/server/common"
	"next-terminal/server/common/nt"
	"next-terminal/server/env"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"

	"gorm.io/gorm"
)

var UserGroupService = new(userGroupService)

type userGroupService struct {
	baseService
}

func (service userGroupService) DeleteById(userGroupId string) error {
	return env.GetDB().Transaction(func(tx *gorm.DB) error {
		c := service.Context(tx)
		// 删除用户组
		if err := repository.UserGroupRepository.DeleteById(c, userGroupId); err != nil {
			return err
		}
		// 删除用户组与用户的关系
		if err := repository.UserGroupMemberRepository.DeleteByUserGroupId(c, userGroupId); err != nil {
			return err
		}
		// 删除用户组与资产的关系
		if err := repository.AuthorisedRepository.DeleteByUserGroupId(c, userGroupId); err != nil {
			return err
		}
		return nil
	})
}

func (service userGroupService) Create(ctx context.Context, name string, members []string) (model.UserGroup, error) {
	exist, err := repository.UserGroupRepository.ExistByName(ctx, name)
	if err != nil {
		return model.UserGroup{}, err
	}

	if exist {
		return model.UserGroup{}, nt.ErrNameAlreadyUsed
	}

	userGroupId := utils.UUID()
	userGroup := model.UserGroup{
		ID:      userGroupId,
		Created: common.NowJsonTime(),
		Name:    name,
	}

	return userGroup, service.Transaction(ctx, func(ctx context.Context) error {
		if err := repository.UserGroupRepository.Create(ctx, &userGroup); err != nil {
			return err
		}
		if len(members) > 0 {
			for _, member := range members {
				userGroupMember := model.UserGroupMember{
					ID:          utils.Sign([]string{userGroupId, member}),
					UserId:      member,
					UserGroupId: userGroupId,
				}
				if err := repository.UserGroupMemberRepository.Create(ctx, &userGroupMember); err != nil {
					return err
				}
			}
		}
		return nil
	})
}

func (service userGroupService) Update(userGroupId string, name string, members []string) (err error) {
	dbUserGroup, err := repository.UserGroupRepository.FindById(context.TODO(), userGroupId)
	if err != nil {
		return err
	}
	if dbUserGroup.Name != name {
		// 修改了名称
		exist, err := repository.UserGroupRepository.ExistByName(context.TODO(), name)
		if err != nil {
			return err
		}

		if exist {
			return nt.ErrNameAlreadyUsed
		}
	}

	return env.GetDB().Transaction(func(tx *gorm.DB) error {
		c := service.Context(tx)
		userGroup := model.UserGroup{
			ID:   userGroupId,
			Name: name,
		}
		if err := repository.UserGroupRepository.Update(c, &userGroup); err != nil {
			return err
		}
		if err := repository.UserGroupMemberRepository.DeleteByUserGroupId(c, userGroupId); err != nil {
			return err
		}
		if len(members) > 0 {
			for _, member := range members {
				userGroupMember := model.UserGroupMember{
					ID:          utils.Sign([]string{userGroupId, member}),
					UserId:      member,
					UserGroupId: userGroupId,
				}
				if err := repository.UserGroupMemberRepository.Create(c, &userGroupMember); err != nil {
					return err
				}
			}
		}
		return nil
	})
}
