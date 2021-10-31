package api

import (
	"next-terminal/server/constant"

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

func OverviewAssetEndPoint(c echo.Context) error {
	account, _ := GetCurrentAccount(c)
	var (
		ssh        int64
		rdp        int64
		vnc        int64
		telnet     int64
		kubernetes int64
	)
	if constant.TypeUser == account.Type {
		ssh, _ = assetRepository.CountByUserIdAndProtocol(account.ID, constant.SSH)
		rdp, _ = assetRepository.CountByUserIdAndProtocol(account.ID, constant.RDP)
		vnc, _ = assetRepository.CountByUserIdAndProtocol(account.ID, constant.VNC)
		telnet, _ = assetRepository.CountByUserIdAndProtocol(account.ID, constant.Telnet)
		kubernetes, _ = assetRepository.CountByUserIdAndProtocol(account.ID, constant.K8s)
	} else {
		ssh, _ = assetRepository.CountByProtocol(constant.SSH)
		rdp, _ = assetRepository.CountByProtocol(constant.RDP)
		vnc, _ = assetRepository.CountByProtocol(constant.VNC)
		telnet, _ = assetRepository.CountByProtocol(constant.Telnet)
		kubernetes, _ = assetRepository.CountByProtocol(constant.K8s)
	}
	m := echo.Map{
		"ssh":        ssh,
		"rdp":        rdp,
		"vnc":        vnc,
		"telnet":     telnet,
		"kubernetes": kubernetes,
	}
	return Success(c, m)
}

func OverviewAccessEndPoint(c echo.Context) error {
	account, _ := GetCurrentAccount(c)
	access, err := sessionRepository.OverviewAccess(account)
	if err != nil {
		return err
	}
	return Success(c, access)
}
