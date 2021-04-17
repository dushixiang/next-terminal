package service

import (
	"encoding/base64"

	"next-terminal/pkg/global"
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
		if item.Password != "" && item.Password != "-" {
			encryptedCBC, err := utils.AesEncryptCBC([]byte(item.Password), global.Config.EncryptionPassword)
			if err != nil {
				return err
			}
			item.Password = base64.StdEncoding.EncodeToString(encryptedCBC)
		}

		if item.PrivateKey != "" && item.PrivateKey != "-" {
			encryptedCBC, err := utils.AesEncryptCBC([]byte(item.PrivateKey), global.Config.EncryptionPassword)
			if err != nil {
				return err
			}
			item.PrivateKey = base64.StdEncoding.EncodeToString(encryptedCBC)
		}

		if item.Passphrase != "" && item.Passphrase != "-" {
			encryptedCBC, err := utils.AesEncryptCBC([]byte(item.Passphrase), global.Config.EncryptionPassword)
			if err != nil {
				return err
			}
			item.Passphrase = base64.StdEncoding.EncodeToString(encryptedCBC)
		}
		err = r.assetRepository.EncryptedById(true, item.Password, item.PrivateKey, item.Passphrase, item.ID)
		if err != nil {
			return err
		}
	}
	return nil
}
