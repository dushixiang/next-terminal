package api

import (
	"context"

	"next-terminal/server/constant"
	"next-terminal/server/dto"
	"next-terminal/server/repository"

	"github.com/labstack/echo/v4"
)

type OverviewApi struct{}

func (api OverviewApi) OverviewCounterEndPoint(c echo.Context) error {
	var (
		countUser          int64
		countOnlineSession int64
		credential         int64
		asset              int64
	)
	countUser, _ = repository.UserRepository.CountOnlineUser(context.TODO())
	countOnlineSession, _ = repository.SessionRepository.CountOnlineSession(context.TODO())
	credential, _ = repository.CredentialRepository.Count(context.TODO())
	asset, _ = repository.AssetRepository.Count(context.TODO())

	counter := dto.Counter{
		User:          countUser,
		OnlineSession: countOnlineSession,
		Credential:    credential,
		Asset:         asset,
	}

	return Success(c, counter)
}

func (api OverviewApi) OverviewAssetEndPoint(c echo.Context) error {
	var (
		ssh        int64
		rdp        int64
		vnc        int64
		telnet     int64
		kubernetes int64
	)

	ssh, _ = repository.AssetRepository.CountByProtocol(context.TODO(), constant.SSH)
	rdp, _ = repository.AssetRepository.CountByProtocol(context.TODO(), constant.RDP)
	vnc, _ = repository.AssetRepository.CountByProtocol(context.TODO(), constant.VNC)
	telnet, _ = repository.AssetRepository.CountByProtocol(context.TODO(), constant.Telnet)
	kubernetes, _ = repository.AssetRepository.CountByProtocol(context.TODO(), constant.K8s)

	m := echo.Map{
		"ssh":        ssh,
		"rdp":        rdp,
		"vnc":        vnc,
		"telnet":     telnet,
		"kubernetes": kubernetes,
	}
	return Success(c, m)
}

func (api OverviewApi) OverviewAccessEndPoint(c echo.Context) error {
	access, err := repository.SessionRepository.OverviewAccess(context.TODO())
	if err != nil {
		return err
	}
	return Success(c, access)
}
