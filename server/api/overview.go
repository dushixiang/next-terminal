package api

import (
	"next-terminal/server/constant"
	"next-terminal/server/repository"

	"github.com/labstack/echo/v4"
)

type Counter struct {
	User          int64 `json:"user"`
	Asset         int64 `json:"asset"`
	Credential    int64 `json:"credential"`
	OnlineSession int64 `json:"onlineSession"`
}

func OverviewCounterEndPoint(c echo.Context) error {
	account, _ := GetCurrentAccount(c)

	var (
		countUser          int64
		countOnlineSession int64
		credential         int64
		asset              int64
	)
	if constant.TypeUser == account.Type {
		countUser, _ = userRepository.CountOnlineUser()
		countOnlineSession, _ = sessionRepository.CountOnlineSession()
		credential, _ = credentialRepository.CountByUserId(account.ID)
		asset, _ = assetRepository.CountByUserId(account.ID)
	} else {
		countUser, _ = userRepository.CountOnlineUser()
		countOnlineSession, _ = sessionRepository.CountOnlineSession()
		credential, _ = credentialRepository.Count()
		asset, _ = assetRepository.Count()
	}
	counter := Counter{
		User:          countUser,
		OnlineSession: countOnlineSession,
		Credential:    credential,
		Asset:         asset,
	}

	return Success(c, counter)
}

func OverviewSessionPoint(c echo.Context) (err error) {
	d := c.QueryParam("d")
	var results []repository.D
	if d == "m" {
		results, err = sessionRepository.CountSessionByDay(30)
	} else {
		results, err = sessionRepository.CountSessionByDay(7)
	}
	if err != nil {
		return err
	}
	return Success(c, results)
}
