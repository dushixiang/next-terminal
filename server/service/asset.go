package service

import (
	"next-terminal/server/config"
	"next-terminal/server/repository"
	"next-terminal/server/utils"
)

type AssetService struct {
	assetRepository *repository.AssetRepository
}

func NewAssetService(assetRepository *repository.AssetRepository) *AssetService {
	return &AssetService{assetRepository: assetRepository}
}

func (r AssetService) Encrypt() error {
	items, err := r.assetRepository.FindAll()
	if err != nil {
		return err
	}
	for i := range items {
		item := items[i]
		if item.Encrypted {
			continue
		}
		if err := r.assetRepository.Encrypt(&item, config.GlobalCfg.EncryptionPassword); err != nil {
			return err
		}
		if err := r.assetRepository.UpdateById(&item, item.ID); err != nil {
			return err
		}
	}
	return nil
}

func (r AssetService) CheckStatus(accessGatewayId string, ip string, port int) (active bool, err error) {
	if accessGatewayId != "" && accessGatewayId != "-" {
		g, e1 := accessGatewayService.GetGatewayAndReconnectById(accessGatewayId)
		if err != nil {
			return false, e1
		}

		uuid := utils.UUID()
		exposedIP, exposedPort, e2 := g.OpenSshTunnel(uuid, ip, port)
		if e2 != nil {
			return false, e2
		}
		defer g.CloseSshTunnel(uuid)

		if g.Connected {
			active, err = utils.Tcping(exposedIP, exposedPort)
		} else {
			active = false
		}
	} else {
		active, err = utils.Tcping(ip, port)
	}
	return active, err
}
