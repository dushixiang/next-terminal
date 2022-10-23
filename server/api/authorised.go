package api

import (
	"context"
	"github.com/labstack/echo/v4"
	"next-terminal/server/common/maps"
	"next-terminal/server/dto"
	"next-terminal/server/repository"
	"next-terminal/server/service"
	"strconv"
)

type AuthorisedApi struct {
}

func (api AuthorisedApi) Selected(c echo.Context) error {
	userId := c.QueryParam("userId")
	userGroupId := c.QueryParam("userGroupId")
	assetId := c.QueryParam("assetId")
	key := c.QueryParam("key")

	items, err := repository.AuthorisedRepository.FindAll(context.Background(), userId, userGroupId, assetId)
	if err != nil {
		return err
	}
	var result = make([]string, 0)
	switch key {
	case "userId":
		for _, item := range items {
			result = append(result, item.UserId)
		}
	case "userGroupId":
		for _, item := range items {
			result = append(result, item.UserGroupId)
		}
	case "assetId":
		for _, item := range items {
			result = append(result, item.AssetId)
		}
	}

	return Success(c, result)
}

func (api AuthorisedApi) Delete(c echo.Context) error {
	id := c.Param("id")
	if err := repository.AuthorisedRepository.DeleteById(context.Background(), id); err != nil {
		return err
	}
	return Success(c, "")
}

func (api AuthorisedApi) PagingAsset(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	assetName := c.QueryParam("assetName")
	userId := c.QueryParam("userId")
	userGroupId := c.QueryParam("userGroupId")

	items, total, err := repository.AuthorisedRepository.FindAssetPage(context.Background(), pageIndex, pageSize, assetName, userId, userGroupId)
	if err != nil {
		return err
	}

	return Success(c, maps.Map{
		"total": total,
		"items": items,
	})
}

func (api AuthorisedApi) PagingUser(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	userName := c.QueryParam("userName")
	assetId := c.QueryParam("assetId")

	items, total, err := repository.AuthorisedRepository.FindUserPage(context.Background(), pageIndex, pageSize, userName, assetId)
	if err != nil {
		return err
	}

	return Success(c, maps.Map{
		"total": total,
		"items": items,
	})
}

func (api AuthorisedApi) PagingUserGroup(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	userGroupName := c.QueryParam("userGroupName")
	assetId := c.QueryParam("assetId")

	items, total, err := repository.AuthorisedRepository.FindUserGroupPage(context.Background(), pageIndex, pageSize, userGroupName, assetId)
	if err != nil {
		return err
	}

	return Success(c, maps.Map{
		"total": total,
		"items": items,
	})
}

func (api AuthorisedApi) AuthorisedAssets(c echo.Context) error {
	var item dto.AuthorisedAsset
	if err := c.Bind(&item); err != nil {
		return err
	}
	if err := service.AuthorisedService.AuthorisedAssets(context.Background(), &item); err != nil {
		return err
	}
	return Success(c, nil)
}

func (api AuthorisedApi) AuthorisedUsers(c echo.Context) error {
	var item dto.AuthorisedUser
	if err := c.Bind(&item); err != nil {
		return err
	}
	if err := service.AuthorisedService.AuthorisedUsers(context.Background(), &item); err != nil {
		return err
	}
	return Success(c, nil)
}

func (api AuthorisedApi) AuthorisedUserGroups(c echo.Context) error {
	var item dto.AuthorisedUserGroup
	if err := c.Bind(&item); err != nil {
		return err
	}
	if err := service.AuthorisedService.AuthorisedUserGroups(context.Background(), &item); err != nil {
		return err
	}
	return Success(c, nil)
}
