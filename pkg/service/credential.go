package service

import (
	"encoding/base64"

	"next-terminal/pkg/global"
	"next-terminal/server/repository"
	"next-terminal/server/utils"
)

type CredentialService struct {
	credentialRepository *repository.CredentialRepository
}

func NewCredentialService(credentialRepository *repository.CredentialRepository) *CredentialService {
	return &CredentialService{credentialRepository: credentialRepository}
}

func (r CredentialService) Encrypt() error {
	items, err := r.credentialRepository.FindAll()
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
		err = r.credentialRepository.EncryptedById(true, item.Password, item.PrivateKey, item.Passphrase, item.ID)
		if err != nil {
			return err
		}
	}
	return nil
}
