package api

import (
	"encoding/base64"
	"errors"
	"strconv"
	"strings"

	"next-terminal/pkg/constant"
	"next-terminal/pkg/global"
	"next-terminal/server/model"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
)

func CredentialAllEndpoint(c echo.Context) error {
	account, _ := GetCurrentAccount(c)
	items, _ := credentialRepository.FindByUser(account)
	return Success(c, items)
}
func CredentialCreateEndpoint(c echo.Context) error {
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
	if err := credentialRepository.Create(&item); err != nil {
		return err
	}

	return Success(c, item)
}

func CredentialPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	name := c.QueryParam("name")

	order := c.QueryParam("order")
	field := c.QueryParam("field")

	account, _ := GetCurrentAccount(c)
	items, total, err := credentialRepository.Find(pageIndex, pageSize, name, order, field, account)
	if err != nil {
		return err
	}

	return Success(c, H{
		"total": total,
		"items": items,
	})
}

func CredentialUpdateEndpoint(c echo.Context) error {
	id := c.Param("id")

	if err := PreCheckCredentialPermission(c, id); err != nil {
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
			encryptedCBC, err := utils.AesEncryptCBC([]byte(item.Password), global.Config.EncryptionPassword)
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
			encryptedCBC, err := utils.AesEncryptCBC([]byte(item.PrivateKey), global.Config.EncryptionPassword)
			if err != nil {
				return err
			}
			item.PrivateKey = base64.StdEncoding.EncodeToString(encryptedCBC)
		}
		if item.Passphrase == "" {
			item.Passphrase = "-"
		}
		if item.Passphrase != "-" {
			encryptedCBC, err := utils.AesEncryptCBC([]byte(item.Passphrase), global.Config.EncryptionPassword)
			if err != nil {
				return err
			}
			item.Passphrase = base64.StdEncoding.EncodeToString(encryptedCBC)
		}
	default:
		return Fail(c, -1, "类型错误")
	}
	item.Encrypted = true

	if err := credentialRepository.UpdateById(&item, id); err != nil {
		return err
	}

	return Success(c, nil)
}

func CredentialDeleteEndpoint(c echo.Context) error {
	id := c.Param("id")
	split := strings.Split(id, ",")
	for i := range split {
		if err := PreCheckCredentialPermission(c, split[i]); err != nil {
			return err
		}
		if err := credentialRepository.DeleteById(split[i]); err != nil {
			return err
		}
		// 删除资产与用户的关系
		if err := resourceSharerRepository.DeleteResourceSharerByResourceId(split[i]); err != nil {
			return err
		}
	}

	return Success(c, nil)
}

func CredentialGetEndpoint(c echo.Context) error {
	id := c.Param("id")
	if err := PreCheckCredentialPermission(c, id); err != nil {
		return err
	}

	item, err := credentialRepository.FindByIdAndDecrypt(id)
	if err != nil {
		return err
	}

	if !HasPermission(c, item.Owner) {
		return errors.New("permission denied")
	}

	return Success(c, item)
}

func CredentialChangeOwnerEndpoint(c echo.Context) error {
	id := c.Param("id")

	if err := PreCheckCredentialPermission(c, id); err != nil {
		return err
	}

	owner := c.QueryParam("owner")
	if err := credentialRepository.UpdateById(&model.Credential{Owner: owner}, id); err != nil {
		return err
	}
	return Success(c, "")
}

func PreCheckCredentialPermission(c echo.Context, id string) error {
	item, err := credentialRepository.FindById(id)
	if err != nil {
		return err
	}

	if !HasPermission(c, item.Owner) {
		return errors.New("permission denied")
	}
	return nil
}
