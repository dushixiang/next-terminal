package api

import (
	"errors"
	"github.com/labstack/echo/v4"
	"next-terminal/pkg/model"
	"next-terminal/pkg/utils"
	"strconv"
	"strings"
)

func CredentialAllEndpoint(c echo.Context) error {
	items, _ := model.FindAllCredential()
	return Success(c, items)
}
func CredentialCreateEndpoint(c echo.Context) error {
	var item model.Credential
	if err := c.Bind(&item); err != nil {
		return err
	}

	item.ID = utils.UUID()
	item.Created = utils.NowJsonTime()

	switch item.Type {
	case model.Custom:
		item.PrivateKey = "-"
		item.Passphrase = "-"
		if len(item.Username) == 0 {
			item.Username = "-"
		}
		if len(item.Password) == 0 {
			item.Password = "-"
		}
	case model.PrivateKey:
		item.Password = "-"
		if len(item.Username) == 0 {
			item.Username = "-"
		}
		if len(item.PrivateKey) == 0 {
			item.PrivateKey = "-"
		}
		if len(item.Passphrase) == 0 {
			item.Passphrase = "-"
		}
	default:
		return Fail(c, -1, "类型错误")
	}

	if err := model.CreateNewCredential(&item); err != nil {
		return err
	}

	return Success(c, item)
}

func CredentialPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	name := c.QueryParam("name")

	var (
		total int64
		items []model.CredentialVo
	)

	account, _ := GetCurrentAccount(c)
	if account.Role == model.RoleUser {
		items, total, _ = model.FindPageCredential(pageIndex, pageSize, name, account.ID)
	} else {
		items, total, _ = model.FindPageCredential(pageIndex, pageSize, name, "")
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
	case model.Custom:
		item.PrivateKey = "-"
		item.Passphrase = "-"
		if len(item.Username) == 0 {
			item.Username = "-"
		}
		if len(item.Password) == 0 {
			item.Password = "-"
		}
	case model.PrivateKey:
		item.Password = "-"
		if len(item.Username) == 0 {
			item.Username = "-"
		}
		if len(item.PrivateKey) == 0 {
			item.PrivateKey = "-"
		}
		if len(item.Passphrase) == 0 {
			item.Passphrase = "-"
		}
	default:
		return Fail(c, -1, "类型错误")
	}

	model.UpdateCredentialById(&item, id)

	return Success(c, nil)
}

func CredentialDeleteEndpoint(c echo.Context) error {
	id := c.Param("id")
	split := strings.Split(id, ",")
	for i := range split {
		if err := PreCheckCredentialPermission(c, split[i]); err != nil {
			return err
		}
		model.DeleteCredentialById(split[i])
	}

	return Success(c, nil)
}

func CredentialGetEndpoint(c echo.Context) error {
	id := c.Param("id")

	item, err := model.FindCredentialById(id)
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
	model.UpdateCredentialById(&model.Credential{Owner: owner}, id)
	return Success(c, "")
}

func PreCheckCredentialPermission(c echo.Context, id string) error {
	item, err := model.FindCredentialById(id)
	if err != nil {
		return err
	}

	if !HasPermission(c, item.Owner) {
		return errors.New("permission denied")
	}
	return nil
}
