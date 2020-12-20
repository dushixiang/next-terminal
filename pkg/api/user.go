package api

import (
	"github.com/labstack/echo/v4"
	"next-terminal/pkg/model"
	"next-terminal/pkg/utils"
	"strconv"
	"strings"
)

func UserCreateEndpoint(c echo.Context) error {
	var item model.User
	if err := c.Bind(&item); err != nil {
		return err
	}

	var pass []byte
	var err error
	if pass, err = utils.Encoder.Encode([]byte("admin")); err != nil {
		return err
	}
	item.Password = string(pass)

	item.ID = utils.UUID()
	item.Created = utils.NowJsonTime()

	if err := model.CreateNewUser(&item); err != nil {
		return err
	}

	return Success(c, item)
}

func UserPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	username := c.QueryParam("username")
	nickname := c.QueryParam("nickname")

	items, total, err := model.FindPageUser(pageIndex, pageSize, username, nickname)
	if err != nil {
		return err
	}

	return Success(c, H{
		"total": total,
		"items": items,
	})
}

func UserUpdateEndpoint(c echo.Context) error {
	id := c.Param("id")

	var item model.User
	if err := c.Bind(&item); err != nil {
		return err
	}

	model.UpdateUserById(&item, id)

	return Success(c, nil)
}

func UserDeleteEndpoint(c echo.Context) error {
	id := c.Param("id")
	split := strings.Split(id, ",")
	for i := range split {
		model.DeleteUserById(split[i])
	}

	return Success(c, nil)
}

func UserGetEndpoint(c echo.Context) error {
	id := c.Param("id")

	item, err := model.FindUserById(id)
	if err != nil {
		return err
	}

	return Success(c, item)
}
