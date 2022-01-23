package cli

import (
	"context"
	"crypto/md5"
	"fmt"

	"next-terminal/server/constant"
	"next-terminal/server/env"
	"next-terminal/server/log"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/service"
	"next-terminal/server/utils"

	"gorm.io/gorm"
)

type Cli struct {
}

func NewCli() *Cli {
	return &Cli{}
}

func (cli Cli) ResetPassword(username string) error {
	user, err := repository.UserRepository.FindByUsername(context.TODO(), username)
	if err != nil {
		return err
	}
	password := "next-terminal"
	passwd, err := utils.Encoder.Encode([]byte(password))
	if err != nil {
		return err
	}
	u := &model.User{
		Password: string(passwd),
		ID:       user.ID,
	}
	if err := repository.UserRepository.Update(context.TODO(), u); err != nil {
		return err
	}
	log.Debugf("用户「%v」密码初始化为: %v", user.Username, password)
	return nil
}

func (cli Cli) ResetTotp(username string) error {
	user, err := repository.UserRepository.FindByUsername(context.TODO(), username)
	if err != nil {
		return err
	}
	u := &model.User{
		TOTPSecret: "-",
		ID:         user.ID,
	}
	if err := repository.UserRepository.Update(context.TODO(), u); err != nil {
		return err
	}
	log.Debugf("用户「%v」已重置TOTP", user.Username)
	return nil
}

func (cli Cli) ChangeEncryptionKey(oldEncryptionKey, newEncryptionKey string) error {

	oldPassword := []byte(fmt.Sprintf("%x", md5.Sum([]byte(oldEncryptionKey))))
	newPassword := []byte(fmt.Sprintf("%x", md5.Sum([]byte(newEncryptionKey))))

	return env.GetDB().Transaction(func(tx *gorm.DB) error {
		c := context.WithValue(context.TODO(), constant.DB, tx)
		credentials, err := repository.CredentialRepository.FindAll(c)
		if err != nil {
			return err
		}
		for i := range credentials {
			credential := credentials[i]
			if err := service.CredentialService.Decrypt(&credential, oldPassword); err != nil {
				return err
			}
			if err := service.CredentialService.Encrypt(&credential, newPassword); err != nil {
				return err
			}
			if err := repository.CredentialRepository.UpdateById(c, &credential, credential.ID); err != nil {
				return err
			}
		}
		assets, err := repository.AssetRepository.FindAll(c)
		if err != nil {
			return err
		}
		for i := range assets {
			asset := assets[i]
			if err := service.AssetService.Decrypt(&asset, oldPassword); err != nil {
				return err
			}
			if err := service.AssetService.Encrypt(&asset, newPassword); err != nil {
				return err
			}
			if err := repository.AssetRepository.UpdateById(c, &asset, asset.ID); err != nil {
				return err
			}
		}
		log.Infof("encryption key has being changed.")
		return nil
	})
}
