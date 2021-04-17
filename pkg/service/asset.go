package service

import (
	"next-terminal/pkg/global"
	"next-terminal/server/repository"
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
		if err := r.assetRepository.Encrypt(&item, global.Config.EncryptionPassword); err != nil {
			return err
		}
		if err := r.assetRepository.UpdateById(&item, item.ID); err != nil {
			return err
		}
	}
	return nil
}
