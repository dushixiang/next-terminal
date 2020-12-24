package api

import (
	"github.com/labstack/echo/v4"
	"next-terminal/pkg/global"
	"next-terminal/pkg/model"
	"next-terminal/pkg/utils"
	"time"
)

type LoginAccount struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func LoginEndpoint(c echo.Context) error {
	var loginAccount LoginAccount
	if err := c.Bind(&loginAccount); err != nil {
		return err
	}

	user, err := model.FindUserByUsername(loginAccount.Username)
	if err != nil {
		return err
	}
	if err := utils.Encoder.Match([]byte(user.Password), []byte(loginAccount.Password)); err != nil {
		return err
	}

	token := utils.UUID()

	global.Cache.Set(token, user, time.Minute*time.Duration(30))

	model.UpdateUserById(&model.User{Online: true}, user.ID)

	return Success(c, token)
}

func LogoutEndpoint(c echo.Context) error {
	token := GetToken(c)
	global.Cache.Delete(token)
	return Success(c, nil)
}

func ChangePasswordEndpoint(c echo.Context) error {
	return nil
}

func InfoEndpoint(c echo.Context) error {
	account, _ := GetCurrentAccount(c)
	return Success(c, account)
}
