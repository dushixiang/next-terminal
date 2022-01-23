package service

import (
	"context"
	"encoding/base64"

	"next-terminal/server/model"
	"next-terminal/server/utils"

	"next-terminal/server/config"
	"next-terminal/server/repository"
)

type credentialService struct {
}

func (s credentialService) EncryptAll() error {
	items, err := repository.CredentialRepository.FindAll(context.TODO())
	if err != nil {
		return err
	}
	for i := range items {
		item := items[i]
		if item.Encrypted {
			continue
		}
		if err := s.Encrypt(&item, config.GlobalCfg.EncryptionPassword); err != nil {
			return err
		}
		if err := repository.CredentialRepository.UpdateById(context.TODO(), &item, item.ID); err != nil {
			return err
		}
	}
	return nil
}

func (s credentialService) Encrypt(item *model.Credential, password []byte) error {
	if item.Password != "-" {
		encryptedCBC, err := utils.AesEncryptCBC([]byte(item.Password), password)
		if err != nil {
			return err
		}
		item.Password = base64.StdEncoding.EncodeToString(encryptedCBC)
	}
	if item.PrivateKey != "-" {
		encryptedCBC, err := utils.AesEncryptCBC([]byte(item.PrivateKey), password)
		if err != nil {
			return err
		}
		item.PrivateKey = base64.StdEncoding.EncodeToString(encryptedCBC)
	}
	if item.Passphrase != "-" {
		encryptedCBC, err := utils.AesEncryptCBC([]byte(item.Passphrase), password)
		if err != nil {
			return err
		}
		item.Passphrase = base64.StdEncoding.EncodeToString(encryptedCBC)
	}
	item.Encrypted = true
	return nil
}

func (s credentialService) Decrypt(item *model.Credential, password []byte) error {
	if item.Encrypted {
		if item.Password != "" && item.Password != "-" {
			origData, err := base64.StdEncoding.DecodeString(item.Password)
			if err != nil {
				return err
			}
			decryptedCBC, err := utils.AesDecryptCBC(origData, password)
			if err != nil {
				return err
			}
			item.Password = string(decryptedCBC)
		}
		if item.PrivateKey != "" && item.PrivateKey != "-" {
			origData, err := base64.StdEncoding.DecodeString(item.PrivateKey)
			if err != nil {
				return err
			}
			decryptedCBC, err := utils.AesDecryptCBC(origData, password)
			if err != nil {
				return err
			}
			item.PrivateKey = string(decryptedCBC)
		}
		if item.Passphrase != "" && item.Passphrase != "-" {
			origData, err := base64.StdEncoding.DecodeString(item.Passphrase)
			if err != nil {
				return err
			}
			decryptedCBC, err := utils.AesDecryptCBC(origData, password)
			if err != nil {
				return err
			}
			item.Passphrase = string(decryptedCBC)
		}
	}
	return nil
}

func (s credentialService) FindByIdAndDecrypt(c context.Context, id string) (o model.Credential, err error) {
	credential, err := repository.CredentialRepository.FindById(c, id)
	if err != nil {
		return o, err
	}
	if err := s.Decrypt(&credential, config.GlobalCfg.EncryptionPassword); err != nil {
		return o, err
	}
	return credential, nil
}

func (s credentialService) Create(item *model.Credential) error {
	// 加密密码之后进行存储
	if err := s.Encrypt(item, config.GlobalCfg.EncryptionPassword); err != nil {
		return err
	}
	return repository.CredentialRepository.Create(context.TODO(), item)
}
