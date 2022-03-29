package service

import (
	"context"
	"encoding/base64"
	"encoding/json"

	"next-terminal/server/config"
	"next-terminal/server/constant"
	"next-terminal/server/env"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type assetService struct {
	baseService
}

func (s assetService) EncryptAll() error {
	items, err := repository.AssetRepository.FindAll(context.TODO())
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
		if err := repository.AssetRepository.UpdateById(context.TODO(), &item, item.ID); err != nil {
			return err
		}
	}
	return nil
}

func (s assetService) Decrypt(item *model.Asset, password []byte) error {
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

func (s assetService) Encrypt(item *model.Asset, password []byte) error {
	if item.Password != "" && item.Password != "-" {
		encryptedCBC, err := utils.AesEncryptCBC([]byte(item.Password), password)
		if err != nil {
			return err
		}
		item.Password = base64.StdEncoding.EncodeToString(encryptedCBC)
	}
	if item.PrivateKey != "" && item.PrivateKey != "-" {
		encryptedCBC, err := utils.AesEncryptCBC([]byte(item.PrivateKey), password)
		if err != nil {
			return err
		}
		item.PrivateKey = base64.StdEncoding.EncodeToString(encryptedCBC)
	}
	if item.Passphrase != "" && item.Passphrase != "-" {
		encryptedCBC, err := utils.AesEncryptCBC([]byte(item.Passphrase), password)
		if err != nil {
			return err
		}
		item.Passphrase = base64.StdEncoding.EncodeToString(encryptedCBC)
	}
	item.Encrypted = true
	return nil
}

func (s assetService) FindByIdAndDecrypt(c context.Context, id string) (model.Asset, error) {
	asset, err := repository.AssetRepository.FindById(c, id)
	if err != nil {
		return model.Asset{}, err
	}
	if err := s.Decrypt(&asset, config.GlobalCfg.EncryptionPassword); err != nil {
		return model.Asset{}, err
	}
	return asset, nil
}

func (s assetService) CheckStatus(accessGatewayId string, ip string, port int) (active bool, err error) {
	if accessGatewayId != "" && accessGatewayId != "-" {
		g, e1 := GatewayService.GetGatewayAndReconnectById(accessGatewayId)
		if e1 != nil {
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

func (s assetService) Create(ctx context.Context, m echo.Map) (model.Asset, error) {

	data, err := json.Marshal(m)
	if err != nil {
		return model.Asset{}, err
	}
	var item model.Asset
	if err := json.Unmarshal(data, &item); err != nil {
		return model.Asset{}, err
	}

	item.ID = utils.UUID()
	item.Created = utils.NowJsonTime()
	item.Active = true

	if s.InTransaction(ctx) {
		return item, s.create(ctx, item, m)
	} else {
		return item, env.GetDB().Transaction(func(tx *gorm.DB) error {
			c := s.Context(tx)
			return s.create(c, item, m)
		})
	}
}

func (s assetService) create(c context.Context, item model.Asset, m echo.Map) error {
	if err := s.Encrypt(&item, config.GlobalCfg.EncryptionPassword); err != nil {
		return err
	}
	if err := repository.AssetRepository.Create(c, &item); err != nil {
		return err
	}

	if err := repository.AssetRepository.UpdateAttributes(c, item.ID, item.Protocol, m); err != nil {
		return err
	}

	//go func() {
	//	active, _ := s.CheckStatus(item.AccessGatewayId, item.IP, item.Port)
	//
	//	if item.Active != active {
	//		_ = repository.AssetRepository.UpdateActiveById(context.TODO(), active, item.ID)
	//	}
	//}()
	return nil
}

func (s assetService) DeleteById(id string) error {
	return env.GetDB().Transaction(func(tx *gorm.DB) error {
		c := s.Context(tx)
		// 删除资产
		if err := repository.AssetRepository.DeleteById(c, id); err != nil {
			return err
		}
		// 删除资产属性
		if err := repository.AssetRepository.DeleteAttrByAssetId(c, id); err != nil {
			return err
		}
		// 删除资产与用户的关系
		if err := repository.ResourceSharerRepository.DeleteByResourceId(c, id); err != nil {
			return err
		}
		return nil
	})
}

func (s assetService) UpdateById(id string, m echo.Map) error {
	data, err := json.Marshal(m)
	if err != nil {
		return err
	}
	var item model.Asset
	if err := json.Unmarshal(data, &item); err != nil {
		return err
	}

	switch item.AccountType {
	case "credential":
		item.Username = "-"
		item.Password = "-"
		item.PrivateKey = "-"
		item.Passphrase = "-"
	case "private-key":
		item.Password = "-"
		item.CredentialId = "-"
		if len(item.Username) == 0 {
			item.Username = "-"
		}
		if len(item.Passphrase) == 0 {
			item.Passphrase = "-"
		}
	case "custom":
		item.PrivateKey = "-"
		item.Passphrase = "-"
		item.CredentialId = "-"
		if len(item.Username) == 0 {
			item.Username = "-"
		}
		if len(item.Password) == 0 {
			item.Password = "-"
		}
	}

	if len(item.Tags) == 0 {
		item.Tags = "-"
	}

	if item.Description == "" {
		item.Description = "-"
	}

	if err := s.Encrypt(&item, config.GlobalCfg.EncryptionPassword); err != nil {
		return err
	}
	return env.GetDB().Transaction(func(tx *gorm.DB) error {
		c := s.Context(tx)

		if err := repository.AssetRepository.UpdateById(c, &item, id); err != nil {
			return err
		}
		if err := repository.AssetRepository.UpdateAttributes(c, id, item.Protocol, m); err != nil {
			return err
		}
		return nil
	})

}

func (s assetService) FixSshMode() error {
	return repository.AssetRepository.UpdateAttrs(context.TODO(), "ssh-mode", "naive", constant.Native)
}
