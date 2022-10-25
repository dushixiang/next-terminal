package api

import (
	"context"
	"encoding/base64"
	"next-terminal/server/common"
	"next-terminal/server/common/maps"
	"next-terminal/server/common/nt"
	"strconv"
	"strings"

	"next-terminal/server/config"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/service"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
)

type CredentialApi struct{}

func (api CredentialApi) CredentialAllEndpoint(c echo.Context) error {
	items, err := repository.CredentialRepository.FindByAll(context.Background())
	if err != nil {
		return err
	}
	return Success(c, items)
}
func (api CredentialApi) CredentialCreateEndpoint(c echo.Context) error {
	var item model.Credential
	if err := c.Bind(&item); err != nil {
		return err
	}

	account, _ := GetCurrentAccount(c)
	item.Owner = account.ID
	item.ID = utils.UUID()
	item.Created = common.NowJsonTime()

	switch item.Type {
	case nt.Custom:
		item.PrivateKey = "-"
		item.Passphrase = "-"
		if item.Username == "" {
			item.Username = "-"
		}
		if item.Password == "" {
			item.Password = "-"
		}
	case nt.PrivateKey:
		item.Password = "-"
		if item.Username == "" {
			item.Username = "-"
		}
		if item.PrivateKey == "" {
			item.PrivateKey = "-"
		}
		if item.Passphrase == "" {
			item.Passphrase = "-"
		}
	default:
		return Fail(c, -1, "类型错误")
	}

	item.Encrypted = true

	if err := service.CredentialService.Create(context.TODO(), &item); err != nil {
		return err
	}

	return Success(c, item)
}

func (api CredentialApi) CredentialPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	name := c.QueryParam("name")

	order := c.QueryParam("order")
	field := c.QueryParam("field")

	items, total, err := repository.CredentialRepository.Find(context.TODO(), pageIndex, pageSize, name, order, field)
	if err != nil {
		return err
	}

	return Success(c, maps.Map{
		"total": total,
		"items": items,
	})
}

func (api CredentialApi) CredentialUpdateEndpoint(c echo.Context) error {
	id := c.Param("id")

	var item model.Credential
	if err := c.Bind(&item); err != nil {
		return err
	}

	switch item.Type {
	case nt.Custom:
		item.PrivateKey = "-"
		item.Passphrase = "-"
		if item.Username == "" {
			item.Username = "-"
		}
		if item.Password == "" {
			item.Password = "-"
		}
		if item.Password != "-" {
			encryptedCBC, err := utils.AesEncryptCBC([]byte(item.Password), config.GlobalCfg.EncryptionPassword)
			if err != nil {
				return err
			}
			item.Password = base64.StdEncoding.EncodeToString(encryptedCBC)
		}
	case nt.PrivateKey:
		item.Password = "-"
		if item.Username == "" {
			item.Username = "-"
		}
		if item.PrivateKey == "" {
			item.PrivateKey = "-"
		}
		if item.PrivateKey != "-" {
			encryptedCBC, err := utils.AesEncryptCBC([]byte(item.PrivateKey), config.GlobalCfg.EncryptionPassword)
			if err != nil {
				return err
			}
			item.PrivateKey = base64.StdEncoding.EncodeToString(encryptedCBC)
		}
		if item.Passphrase == "" {
			item.Passphrase = "-"
		}
		if item.Passphrase != "-" {
			encryptedCBC, err := utils.AesEncryptCBC([]byte(item.Passphrase), config.GlobalCfg.EncryptionPassword)
			if err != nil {
				return err
			}
			item.Passphrase = base64.StdEncoding.EncodeToString(encryptedCBC)
		}
	default:
		return Fail(c, -1, "类型错误")
	}
	item.Encrypted = true

	if err := repository.CredentialRepository.UpdateById(context.TODO(), &item, id); err != nil {
		return err
	}

	return Success(c, nil)
}

func (api CredentialApi) CredentialDeleteEndpoint(c echo.Context) error {
	id := c.Param("id")
	split := strings.Split(id, ",")
	for i := range split {
		if err := repository.CredentialRepository.DeleteById(context.TODO(), split[i]); err != nil {
			return err
		}
	}

	return Success(c, nil)
}

func (api CredentialApi) CredentialGetEndpoint(c echo.Context) error {
	id := c.Param("id")

	item, err := service.CredentialService.FindByIdAndDecrypt(context.TODO(), id)
	if err != nil {
		return err
	}

	return Success(c, item)
}

func (api CredentialApi) CredentialChangeOwnerEndpoint(c echo.Context) error {
	id := c.Param("id")

	owner := c.QueryParam("owner")
	if err := repository.CredentialRepository.UpdateById(context.TODO(), &model.Credential{Owner: owner}, id); err != nil {
		return err
	}
	return Success(c, "")
}
