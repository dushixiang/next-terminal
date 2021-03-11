package api

import (
	"next-terminal/pkg/global"
	"next-terminal/pkg/model"
	"next-terminal/pkg/totp"
	"next-terminal/pkg/utils"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
)

const (
	RememberEffectiveTime    = time.Hour * time.Duration(24*14)
	NotRememberEffectiveTime = time.Hour * time.Duration(2)
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

	// 存储登录失败次数信息
	loginFailCountKey := loginAccount.Username
	v, ok := global.Cache.Get(loginFailCountKey)
	if !ok {
		v = 1
	}
	count := v.(int)
	if count >= 5 {
		return Fail(c, -1, "登录失败次数过多，请稍后再试")
	}

	if err != nil {
		count++
		global.Cache.Set(loginFailCountKey, count, time.Minute*time.Duration(5))
		return FailWithData(c, -1, "您输入的账号或密码不正确", count)
	}

	if err := utils.Encoder.Match([]byte(user.Password), []byte(loginAccount.Password)); err != nil {
		count++
		global.Cache.Set(loginFailCountKey, count, time.Minute*time.Duration(5))
		return FailWithData(c, -1, "您输入的账号或密码不正确", count)
	}

	if user.TOTPSecret != "" && user.TOTPSecret != "-" {
		return Fail(c, 0, "")
	}

	token, err := LoginSuccess(c, loginAccount, user)
	if err != nil {
		return err
	}

	return Success(c, token)
}

func LoginSuccess(c echo.Context, loginAccount LoginAccount, user model.User) (token string, err error) {
	token = strings.Join([]string{utils.UUID(), utils.UUID(), utils.UUID(), utils.UUID()}, "")

	authorization := Authorization{
		Token:    token,
		Remember: loginAccount.Remember,
		User:     user,
	}

	cacheKey := BuildCacheKeyByToken(token)

	if authorization.Remember {
		// 记住登录有效期两周
		global.Cache.Set(cacheKey, authorization, RememberEffectiveTime)
	} else {
		global.Cache.Set(cacheKey, authorization, NotRememberEffectiveTime)
	}

	// 保存登录日志
	loginLog := model.LoginLog{
		ID:              token,
		UserId:          user.ID,
		ClientIP:        c.RealIP(),
		ClientUserAgent: c.Request().UserAgent(),
		LoginTime:       utils.NowJsonTime(),
		Remember:        authorization.Remember,
	}

	if model.CreateNewLoginLog(&loginLog) != nil {
		return "", err
	}

	// 修改登录状态
	model.UpdateUserById(&model.User{Online: true}, user.ID)
	return token, nil
}

func BuildCacheKeyByToken(token string) string {
	cacheKey := strings.Join([]string{Token, token}, ":")
	return cacheKey
}

func GetTokenFormCacheKey(cacheKey string) string {
	token := strings.Split(cacheKey, ":")[1]
	return token
}

func loginWithTotpEndpoint(c echo.Context) error {
	var loginAccount LoginAccount
	if err := c.Bind(&loginAccount); err != nil {
		return err
	}

	// 存储登录失败次数信息
	loginFailCountKey := loginAccount.Username
	v, ok := global.Cache.Get(loginFailCountKey)
	if !ok {
		v = 1
	}
	count := v.(int)
	if count >= 5 {
		return Fail(c, -1, "登录失败次数过多，请稍后再试")
	}

	user, err := model.FindUserByUsername(loginAccount.Username)
	if err != nil {
		count++
		global.Cache.Set(loginFailCountKey, count, time.Minute*time.Duration(5))
		return FailWithData(c, -1, "您输入的账号或密码不正确", count)
	}

	if err := utils.Encoder.Match([]byte(user.Password), []byte(loginAccount.Password)); err != nil {
		count++
		global.Cache.Set(loginFailCountKey, count, time.Minute*time.Duration(5))
		return FailWithData(c, -1, "您输入的账号或密码不正确", count)
	}

	if !totp.Validate(loginAccount.TOTP, user.TOTPSecret) {
		count++
		global.Cache.Set(loginFailCountKey, count, time.Minute*time.Duration(5))
		return FailWithData(c, -1, "您输入双因素认证授权码不正确", count)
	}

	token, err := LoginSuccess(c, loginAccount, user)
	if err != nil {
		return err
	}

	return Success(c, token)
}

func LogoutEndpoint(c echo.Context) error {
	token := GetToken(c)
	cacheKey := BuildCacheKeyByToken(token)
	global.Cache.Delete(cacheKey)
	err := model.Logout(token)
	if err != nil {
		return err
	}
	return Success(c, nil)
}

func ConfirmTOTPEndpoint(c echo.Context) error {
	if global.Config.Demo {
		return Fail(c, 0, "演示模式禁止开启两步验证")
	}
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

func ReloadTOTPEndpoint(c echo.Context) error {
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

func ResetTOTPEndpoint(c echo.Context) error {
	account, _ := GetCurrentAccount(c)
	u := &model.User{
		TOTPSecret: "-",
	}
	model.UpdateUserById(u, account.ID)
	return Success(c, "")
}

func ChangePasswordEndpoint(c echo.Context) error {
	if global.Config.Demo {
		return Fail(c, 0, "演示模式禁止修改密码")
	}
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

type AccountInfo struct {
	Id         string `json:"id"`
	Username   string `json:"username"`
	Nickname   string `json:"nickname"`
	Type       string `json:"type"`
	EnableTotp bool   `json:"enableTotp"`
}

func InfoEndpoint(c echo.Context) error {
	account, _ := GetCurrentAccount(c)

	user, err := model.FindUserById(account.ID)
	if err != nil {
		return err
	}

	info := AccountInfo{
		Id:         user.ID,
		Username:   user.Username,
		Nickname:   user.Nickname,
		Type:       user.Type,
		EnableTotp: user.TOTPSecret != "" && user.TOTPSecret != "-",
	}
	return Success(c, info)
}
