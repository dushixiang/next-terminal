package api

import (
	"context"
	"encoding/base64"
	"errors"
	"strconv"
	"strings"

	"next-terminal/server/config"
	"next-terminal/server/constant"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/service"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
)

type CredentialApi struct{}

func (api CredentialApi) CredentialAllEndpoint(c echo.Context) error {
	items, err := repository.CredentialRepository.FindByUser(context.TODO())
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
	item.Created = utils.NowJsonTime()

	switch item.Type {
	case constant.Custom:
		item.PrivateKey = "-"
		item.Passphrase = "-"
		if item.Username == "" {
			item.Username = "-"
		}
		if item.Password == "" {
			item.Password = "-"
		}
	case constant.PrivateKey:
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

	if err := service.CredentialService.Create(&item); err != nil {
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

	account, _ := GetCurrentAccount(c)
	items, total, err := repository.CredentialRepository.Find(context.TODO(), pageIndex, pageSize, name, order, field, account)
	if err != nil {
		return err
	}

	return Success(c, Map{
		"total": total,
		"items": items,
	})
}

func (api CredentialApi) CredentialUpdateEndpoint(c echo.Context) error {
	id := c.Param("id")

	if err := api.PreCheckCredentialPermission(c, id); err != nil {
		return err
	}

	var item model.Credential
	if err := c.Bind(&item); err != nil {
		return err
	}

	switch item.Type {
	case constant.Custom:
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
	case constant.PrivateKey:
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
		if err := api.PreCheckCredentialPermission(c, split[i]); err != nil {
			return err
		}
		if err := repository.CredentialRepository.DeleteById(context.TODO(), split[i]); err != nil {
			return err
		}
	}

	return Success(c, nil)
}

func (api CredentialApi) CredentialGetEndpoint(c echo.Context) error {
	id := c.Param("id")
	if err := api.PreCheckCredentialPermission(c, id); err != nil {
		return err
	}

	item, err := service.CredentialService.FindByIdAndDecrypt(context.TODO(), id)
	if err != nil {
		return err
	}

	if !HasPermission(c, item.Owner) {
		return errors.New("permission denied")
	}

	return Success(c, item)
}

func (api CredentialApi) CredentialChangeOwnerEndpoint(c echo.Context) error {
	id := c.Param("id")

	if err := api.PreCheckCredentialPermission(c, id); err != nil {
		return err
	}

	owner := c.QueryParam("owner")
	if err := repository.CredentialRepository.UpdateById(context.TODO(), &model.Credential{Owner: owner}, id); err != nil {
		return err
	}
	return Success(c, "")
}

func (api CredentialApi) PreCheckCredentialPermission(c echo.Context, id string) error {
	item, err := repository.CredentialRepository.FindById(context.TODO(), id)
	if err != nil {
		return err
	}

	if !HasPermission(c, item.Owner) {
		return errors.New("permission denied")
	}
	return nil
}
