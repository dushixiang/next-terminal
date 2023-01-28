package service

import (
	"context"

	"next-terminal/server/common"
	"next-terminal/server/dto"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"

	"github.com/pkg/errors"
	"gorm.io/gorm"
)

var AuthorisedService = new(authorisedService)

type authorisedService struct {
	baseService
}

func (s authorisedService) AuthorisedAssets(ctx context.Context, item *dto.AuthorisedAsset) error {
	return s.Transaction(ctx, func(ctx context.Context) error {

		var items []model.Authorised
		for _, assetId := range item.AssetIds {

			id := utils.Sign([]string{assetId, item.UserId, item.UserGroupId})

			if err := repository.AuthorisedRepository.DeleteById(ctx, id); err != nil {
				return err
			}

			authorised := model.Authorised{
				ID:              id,
				AssetId:         assetId,
				CommandFilterId: item.CommandFilterId,
				StrategyId:      item.StrategyId,
				UserId:          item.UserId,
				UserGroupId:     item.UserGroupId,
				Created:         common.NowJsonTime(),
			}
			items = append(items, authorised)
		}

		return repository.AuthorisedRepository.CreateInBatches(ctx, items)
	})
}

func (s authorisedService) AuthorisedUsers(ctx context.Context, item *dto.AuthorisedUser) error {
	return s.Transaction(ctx, func(ctx context.Context) error {

		var items []model.Authorised
		for _, userId := range item.UserIds {

			id := utils.Sign([]string{item.AssetId, userId, ""})

			if err := repository.AuthorisedRepository.DeleteById(ctx, id); err != nil {
				return err
			}

			authorised := model.Authorised{
				ID:              id,
				AssetId:         item.AssetId,
				CommandFilterId: item.CommandFilterId,
				StrategyId:      item.StrategyId,
				UserId:          userId,
				UserGroupId:     "",
				Created:         common.NowJsonTime(),
			}
			items = append(items, authorised)
		}

		return repository.AuthorisedRepository.CreateInBatches(ctx, items)
	})
}

func (s authorisedService) AuthorisedUserGroups(ctx context.Context, item *dto.AuthorisedUserGroup) error {
	return s.Transaction(ctx, func(ctx context.Context) error {

		var items []model.Authorised
		for _, userGroupId := range item.UserGroupIds {

			id := utils.Sign([]string{item.AssetId, "", userGroupId})

			if err := repository.AuthorisedRepository.DeleteById(ctx, id); err != nil {
				return err
			}

			authorised := model.Authorised{
				ID:              id,
				AssetId:         item.AssetId,
				CommandFilterId: item.CommandFilterId,
				StrategyId:      item.StrategyId,
				UserId:          "",
				UserGroupId:     userGroupId,
				Created:         common.NowJsonTime(),
			}
			items = append(items, authorised)
		}

		return repository.AuthorisedRepository.CreateInBatches(ctx, items)
	})
}

func (s authorisedService) GetAuthorised(userId, assetId string) (item *model.Authorised, err error) {
	id := utils.Sign([]string{assetId, userId, ""})
	authorised, err := repository.AuthorisedRepository.FindById(context.Background(), id)
	if err != nil {
		if errors.Is(gorm.ErrRecordNotFound, err) {
			groupIds, err := repository.UserGroupMemberRepository.FindUserGroupIdsByUserId(context.Background(), userId)
			if err != nil {
				return nil, err
			}

			for _, groupId := range groupIds {
				id := utils.Sign([]string{assetId, "", groupId})
				authorised, err := repository.AuthorisedRepository.FindById(context.Background(), id)
				if err != nil {
					continue
				}
				item = &authorised
				break
			}
			return item, err
		}
		return nil, err
	}
	return &authorised, nil
}
