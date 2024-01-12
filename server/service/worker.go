package service

import (
	"context"
	"fmt"
	"next-terminal/server/common/sets"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"
)

var WorkerService = &workerService{}

type workerService struct {
}

func (s *workerService) FindMyAssetPaging(pageIndex, pageSize int, name, protocol, tags string, userId string, order, field string) (o []model.AssetForPage, total int64, err error) {
	assetIdList, err := s.getAssetIdListByUserId(userId)
	if err != nil {
		return nil, 0, err
	}

	items, total, err := repository.AssetRepository.FindMyAssets(context.Background(), pageIndex, pageSize, name, protocol, tags, assetIdList, order, field)
	if err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (s *workerService) FindMyAssetByName(name, protocol, userId string) (o model.Asset, err error) {
	assetIdList, err := s.getAssetIdListByUserId(userId)
	if err != nil {
		return model.Asset{}, err
	}
	item, err := repository.AssetRepository.FindAssetByName(context.Background(), name, protocol)
	if err != nil {
		return model.Asset{}, err
	}

	if len(assetIdList) > 0 {
		for _, id := range assetIdList {
			if item.ID == id {
				return item, nil
			}
		}
	}
	return model.Asset{}, fmt.Errorf("资产不存在")
}

func (s *workerService) FindMyAsset(name, protocol, tags string, userId string, order, field string) (o []model.AssetForPage, err error) {
	assetIdList, err := s.getAssetIdListByUserId(userId)
	if err != nil {
		return nil, err
	}

	items, _, err := repository.AssetRepository.FindMyAssets(context.Background(), 1, 1000, name, protocol, tags, assetIdList, order, field)
	if err != nil {
		return nil, err
	}

	return items, nil
}

func (s *workerService) FindMyAssetTags(ctx context.Context, userId string) ([]string, error) {
	assetIdList, err := s.getAssetIdListByUserId(userId)
	if err != nil {
		return nil, err
	}
	tags, err := repository.AssetRepository.FindMyAssetTags(ctx, assetIdList)
	return tags, err
}

func (s *workerService) getAssetIdListByUserId(userId string) ([]string, error) {
	set := sets.NewStringSet()
	authorisedByUser, err := repository.AuthorisedRepository.FindByUserId(context.Background(), userId)
	if err != nil {
		return nil, err
	}
	for _, authorised := range authorisedByUser {
		set.Add(authorised.AssetId)
	}

	userGroupIds, err := repository.UserGroupMemberRepository.FindUserGroupIdsByUserId(context.Background(), userId)
	if err != nil {
		return nil, err
	}
	authorisedByUserGroup, err := repository.AuthorisedRepository.FindByUserGroupIdIn(context.Background(), userGroupIds)
	if err != nil {
		return nil, err
	}
	for _, authorised := range authorisedByUserGroup {
		set.Add(authorised.AssetId)
	}

	return set.ToArray(), nil
}

func (s *workerService) CheckPermission(assetId, userId string) (bool, error) {
	assetIdList, err := s.getAssetIdListByUserId(userId)
	if err != nil {
		return false, err
	}
	return utils.Contains(assetIdList, assetId), nil
}
