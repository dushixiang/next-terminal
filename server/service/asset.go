package service

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"golang.org/x/net/proxy"
	"net"
	"next-terminal/server/common/maps"
	"next-terminal/server/common/nt"
	"strconv"
	"time"

	"next-terminal/server/common"
	"next-terminal/server/config"
	"next-terminal/server/env"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"

	"gorm.io/gorm"
)

var AssetService = new(assetService)

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

func (s assetService) CheckStatus(asset *model.Asset, ip string, port int) (bool, error) {
	attributes, err := repository.AssetRepository.FindAssetAttrMapByAssetId(context.Background(), asset.ID)
	if err != nil {
		return false, err
	}

	if "true" == attributes[nt.SocksProxyEnable] {
		socks5 := fmt.Sprintf("%s:%s", attributes[nt.SocksProxyHost], attributes[nt.SocksProxyPort])
		auth := &proxy.Auth{
			User:     attributes[nt.SocksProxyUsername],
			Password: attributes[nt.SocksProxyPassword],
		}
		dailer, err := proxy.SOCKS5("tcp", socks5, auth, &net.Dialer{
			Timeout:   15 * time.Second,
			KeepAlive: 15 * time.Second,
		})
		if err != nil {
			return false, err
		}

		target := fmt.Sprintf("%s:%s", ip, strconv.Itoa(port))
		c, err := dailer.Dial("tcp", target)
		if err != nil {
			return false, err
		}
		defer c.Close()
		return true, nil
	} else {
		accessGatewayId := asset.AccessGatewayId
		if accessGatewayId != "" && accessGatewayId != "-" {
			g, err := GatewayService.GetGatewayById(accessGatewayId)
			if err != nil {
				return false, err
			}

			uuid := utils.UUID()
			defer g.CloseSshTunnel(uuid)
			exposedIP, exposedPort, err := g.OpenSshTunnel(uuid, ip, port)
			if err != nil {
				return false, err
			}

			return utils.Tcping(exposedIP, exposedPort)
		}

		return utils.Tcping(ip, port)
	}
}

func (s assetService) Create(ctx context.Context, m maps.Map) (*model.Asset, error) {

	data, err := json.Marshal(m)
	if err != nil {
		return nil, err
	}
	var item model.Asset
	if err := json.Unmarshal(data, &item); err != nil {
		return nil, err
	}

	item.ID = utils.UUID()
	item.Created = common.NowJsonTime()
	item.Active = true

	return &item, s.Transaction(ctx, func(ctx context.Context) error {
		if err := s.Encrypt(&item, config.GlobalCfg.EncryptionPassword); err != nil {
			return err
		}
		if err := repository.AssetRepository.Create(ctx, &item); err != nil {
			return err
		}

		if err := repository.AssetRepository.UpdateAttributes(ctx, item.ID, item.Protocol, m); err != nil {
			return err
		}
		return nil
	})
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
		if err := repository.AuthorisedRepository.DeleteByAssetId(c, id); err != nil {
			return err
		}
		return nil
	})
}

func (s assetService) UpdateById(id string, m maps.Map) error {
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

	if item.AccessGatewayId == "" {
		item.AccessGatewayId = "-"
	}

	if err := s.Encrypt(&item, config.GlobalCfg.EncryptionPassword); err != nil {
		return err
	}

	return s.Transaction(context.Background(), func(ctx context.Context) error {
		if err := repository.AssetRepository.UpdateById(ctx, &item, id); err != nil {
			return err
		}
		if err := repository.AssetRepository.UpdateAttributes(ctx, id, item.Protocol, m); err != nil {
			return err
		}
		return nil
	})
}

func (s assetService) FixSshMode() error {
	return repository.AssetRepository.UpdateAttrs(context.TODO(), "ssh-mode", "naive", nt.Native)
}
