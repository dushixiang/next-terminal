package service

import (
	"context"
	"errors"

	"next-terminal/server/constant"
	"next-terminal/server/env"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"

	"gorm.io/gorm"
)

type userGroupService struct {
}

func (service userGroupService) DeleteById(userGroupId string) error {
	return env.GetDB().Transaction(func(tx *gorm.DB) error {
		c := context.WithValue(context.TODO(), constant.DB, tx)
		// 删除用户组
		if err := repository.UserGroupRepository.DeleteById(c, userGroupId); err != nil {
			return err
		}
		// 删除用户组与用户的关系
		if err := repository.UserGroupMemberRepository.DeleteByUserGroupId(c, userGroupId); err != nil {
			return err
		}
		// 删除用户组与资产的关系
		if err := repository.ResourceSharerRepository.DeleteByUserGroupId(c, userGroupId); err != nil {
			return err
		}
		return nil
	})
}

func (service userGroupService) Create(name string, members []string) (model.UserGroup, error) {
	var err error
	_, err = repository.UserGroupRepository.FindByName(context.TODO(), name)
	if err == nil {
		return model.UserGroup{}, constant.ErrNameAlreadyUsed
	}

	if !errors.Is(gorm.ErrRecordNotFound, err) {
		return model.UserGroup{}, err
	}

	userGroupId := utils.UUID()
	userGroup := model.UserGroup{
		ID:      userGroupId,
		Created: utils.NowJsonTime(),
		Name:    name,
	}

	return userGroup, env.GetDB().Transaction(func(tx *gorm.DB) error {
		c := context.WithValue(context.TODO(), constant.DB, tx)
		if err := repository.UserGroupRepository.Create(c, &userGroup); err != nil {
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

func (service userGroupService) Update(userGroupId string, name string, members []string) (err error) {
	var userGroup model.UserGroup
	userGroup, err = repository.UserGroupRepository.FindByName(context.TODO(), name)
	if err == nil && userGroup.ID != userGroupId {
		return constant.ErrNameAlreadyUsed
	}

	if !errors.Is(gorm.ErrRecordNotFound, err) {
		return err
	}

	return env.GetDB().Transaction(func(tx *gorm.DB) error {
		c := context.WithValue(context.TODO(), constant.DB, tx)
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
