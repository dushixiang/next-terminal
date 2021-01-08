package api

import (
	"next-terminal/pkg/global"
	"next-terminal/pkg/model"
	"next-terminal/pkg/totp"
	"next-terminal/pkg/utils"
	"time"

	"github.com/labstack/echo/v4"
)

type LoginAccount struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Remember bool   `json:"remember"`
	TOTP     string `json:"totp"`
}

type ConfirmTOTP struct {
	Secret string `json:"secret"`
	TOTP   string `json:"totp"`
}

type ChangePassword struct {
	NewPassword string `json:"newPassword"`
	OldPassword string `json:"oldPassword"`
}

type Authorization struct {
	Token    string
	Remember bool
	User     model.User
}

func LoginEndpoint(c echo.Context) error {
	var loginAccount LoginAccount
	if err := c.Bind(&loginAccount); err != nil {
		return err
	}

	user, err := model.FindUserByUsername(loginAccount.Username)
	if err != nil {
		return Fail(c, -1, "您输入的账号或密码不正确")
	}

	if err := utils.Encoder.Match([]byte(user.Password), []byte(loginAccount.Password)); err != nil {
		return Fail(c, -1, "您输入的账号或密码不正确")
	}

	if !totp.Validate(loginAccount.TOTP, user.TOTPSecret) {
		return Fail(c, -2, "您的TOTP不匹配")
	}

	token := utils.UUID()

	authorization := Authorization{
		Token:    token,
		Remember: loginAccount.Remember,
		User:     user,
	}

	if authorization.Remember {
		// 记住登录有效期两周
		global.Cache.Set(token, authorization, time.Hour*time.Duration(24*14))
	} else {
		global.Cache.Set(token, authorization, time.Hour*time.Duration(2))
	}

	model.UpdateUserById(&model.User{Online: true}, user.ID)

	return Success(c, token)
}

func LogoutEndpoint(c echo.Context) error {
	token := GetToken(c)
	global.Cache.Delete(token)
	return Success(c, nil)
}

func ConfirmTOTPEndpoint(c echo.Context) error {
	account, _ := GetCurrentAccount(c)

	var confirmTOTP ConfirmTOTP
	if err := c.Bind(&confirmTOTP); err != nil {
		return err
	}

	if !totp.Validate(confirmTOTP.TOTP, confirmTOTP.Secret) {
		return Fail(c, -1, "TOTP 验证失败，请重试")
	}

	u := &model.User{
		TOTPSecret: confirmTOTP.Secret,
	}

	model.UpdateUserById(u, account.ID)

	return Success(c, nil)
}

func ResetTOTPEndpoint(c echo.Context) error {
	account, _ := GetCurrentAccount(c)

	key, err := totp.NewTOTP(totp.GenerateOpts{
		Issuer:      c.Request().Host,
		AccountName: account.Username,
	})
	if err != nil {
		return Fail(c, -1, err.Error())
	}

	qrcode, err := key.Image(200, 200)
	if err != nil {
		return Fail(c, -1, err.Error())
	}

	qrEncode, err := utils.ImageToBase64Encode(qrcode)
	if err != nil {
		return Fail(c, -1, err.Error())
	}

	return Success(c, map[string]string{
		"qr":     qrEncode,
		"secret": key.Secret(),
	})
}

func ChangePasswordEndpoint(c echo.Context) error {
	account, _ := GetCurrentAccount(c)

	var changePassword ChangePassword
	if err := c.Bind(&changePassword); err != nil {
		return err
	}

	if err := utils.Encoder.Match([]byte(account.Password), []byte(changePassword.OldPassword)); err != nil {
		return Fail(c, -1, "您输入的原密码不正确")
	}

	passwd, err := utils.Encoder.Encode([]byte(changePassword.NewPassword))
	if err != nil {
		return err
	}
	u := &model.User{
		Password: string(passwd),
	}

	model.UpdateUserById(u, account.ID)

	return LogoutEndpoint(c)
}

func InfoEndpoint(c echo.Context) error {
	account, _ := GetCurrentAccount(c)
	return Success(c, account)
}
