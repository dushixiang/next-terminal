package api

import (
	"context"
	"errors"
	"path"
	"strconv"

	"next-terminal/server/config"
	"next-terminal/server/constant"
	"next-terminal/server/dto"
	"next-terminal/server/global/cache"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/service"
	"next-terminal/server/totp"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type AccountApi struct{}

func (api AccountApi) LoginEndpoint(c echo.Context) error {
	var loginAccount dto.LoginAccount
	if err := c.Bind(&loginAccount); err != nil {
		return err
	}

	// 存储登录失败次数信息
	loginFailCountKey := c.RealIP() + loginAccount.Username
	v, ok := cache.LoginFailedKeyManager.Get(loginFailCountKey)
	if !ok {
		v = 1
	}
	count := v.(int)
	if count >= 5 {
		return Fail(c, -1, "登录失败次数过多，请等待5分钟后再试")
	}

	user, err := repository.UserRepository.FindByUsername(context.TODO(), loginAccount.Username)
	if err != nil {
		count++
		cache.LoginFailedKeyManager.Set(loginFailCountKey, count, cache.LoginLockExpiration)
		// 保存登录日志
		if err := service.UserService.SaveLoginLog(c.RealIP(), c.Request().UserAgent(), loginAccount.Username, false, loginAccount.Remember, "", "账号或密码不正确"); err != nil {
			return err
		}
		return FailWithData(c, -1, "您输入的账号或密码不正确", count)
	}

	if user.Status == constant.StatusDisabled {
		return Fail(c, -1, "该账户已停用")
	}

	if err := utils.Encoder.Match([]byte(user.Password), []byte(loginAccount.Password)); err != nil {
		count++
		cache.LoginFailedKeyManager.Set(loginFailCountKey, count, cache.LoginLockExpiration)
		// 保存登录日志
		if err := service.UserService.SaveLoginLog(c.RealIP(), c.Request().UserAgent(), loginAccount.Username, false, loginAccount.Remember, "", "账号或密码不正确"); err != nil {
			return err
		}
		return FailWithData(c, -1, "您输入的账号或密码不正确", count)
	}

	if user.TOTPSecret != "" && user.TOTPSecret != "-" {
		return Fail(c, 0, "")
	}

	token, err := api.LoginSuccess(loginAccount, user)
	if err != nil {
		return err
	}
	// 保存登录日志
	if err := service.UserService.SaveLoginLog(c.RealIP(), c.Request().UserAgent(), loginAccount.Username, true, loginAccount.Remember, token, ""); err != nil {
		return err
	}

	return Success(c, token)
}

func (api AccountApi) LoginSuccess(loginAccount dto.LoginAccount, user model.User) (string, error) {
	token := utils.LongUUID()

	authorization := dto.Authorization{
		Token:    token,
		Type:     constant.LoginToken,
		Remember: loginAccount.Remember,
		User:     &user,
	}

	if authorization.Remember {
		// 记住登录有效期两周
		cache.TokenManager.Set(token, authorization, cache.RememberMeExpiration)
	} else {
		cache.TokenManager.Set(token, authorization, cache.NotRememberExpiration)
	}

	// 修改登录状态
	err := repository.UserRepository.Update(context.TODO(), &model.User{Online: true, ID: user.ID})
	return token, err
}

func (api AccountApi) LoginWithTotpEndpoint(c echo.Context) error {
	var loginAccount dto.LoginAccount
	if err := c.Bind(&loginAccount); err != nil {
		return err
	}

	// 存储登录失败次数信息
	loginFailCountKey := c.RealIP() + loginAccount.Username
	v, ok := cache.LoginFailedKeyManager.Get(loginFailCountKey)
	if !ok {
		v = 1
	}
	count := v.(int)
	if count >= 5 {
		return Fail(c, -1, "登录失败次数过多，请等待5分钟后再试")
	}

	user, err := repository.UserRepository.FindByUsername(context.TODO(), loginAccount.Username)
	if err != nil {
		count++
		cache.LoginFailedKeyManager.Set(loginFailCountKey, count, cache.LoginLockExpiration)
		// 保存登录日志
		if err := service.UserService.SaveLoginLog(c.RealIP(), c.Request().UserAgent(), loginAccount.Username, false, loginAccount.Remember, "", "账号或密码不正确"); err != nil {
			return err
		}
		return FailWithData(c, -1, "您输入的账号或密码不正确", count)
	}

	if user.Status == constant.StatusDisabled {
		return Fail(c, -1, "该账户已停用")
	}

	if err := utils.Encoder.Match([]byte(user.Password), []byte(loginAccount.Password)); err != nil {
		count++
		cache.LoginFailedKeyManager.Set(loginFailCountKey, count, cache.LoginLockExpiration)
		// 保存登录日志
		if err := service.UserService.SaveLoginLog(c.RealIP(), c.Request().UserAgent(), loginAccount.Username, false, loginAccount.Remember, "", "账号或密码不正确"); err != nil {
			return err
		}
		return FailWithData(c, -1, "您输入的账号或密码不正确", count)
	}

	if !totp.Validate(loginAccount.TOTP, user.TOTPSecret) {
		count++
		cache.LoginFailedKeyManager.Set(loginFailCountKey, count, cache.LoginLockExpiration)
		// 保存登录日志
		if err := service.UserService.SaveLoginLog(c.RealIP(), c.Request().UserAgent(), loginAccount.Username, false, loginAccount.Remember, "", "双因素认证授权码不正确"); err != nil {
			return err
		}
		return FailWithData(c, -1, "您输入双因素认证授权码不正确", count)
	}

	token, err := api.LoginSuccess(loginAccount, user)
	if err != nil {
		return err
	}
	// 保存登录日志
	if err := service.UserService.SaveLoginLog(c.RealIP(), c.Request().UserAgent(), loginAccount.Username, true, loginAccount.Remember, token, ""); err != nil {
		return err
	}

	return Success(c, token)
}

func (api AccountApi) LogoutEndpoint(c echo.Context) error {
	token := GetToken(c)
	err := service.UserService.LogoutByToken(token)
	if err != nil {
		return err
	}
	return Success(c, nil)
}

func (api AccountApi) ConfirmTOTPEndpoint(c echo.Context) error {
	if config.GlobalCfg.Demo {
		return Fail(c, 0, "演示模式禁止开启两步验证")
	}
	account, _ := GetCurrentAccount(c)

	var confirmTOTP dto.ConfirmTOTP
	if err := c.Bind(&confirmTOTP); err != nil {
		return err
	}

	if !totp.Validate(confirmTOTP.TOTP, confirmTOTP.Secret) {
		return Fail(c, -1, "TOTP 验证失败，请重试")
	}

	u := &model.User{
		TOTPSecret: confirmTOTP.Secret,
		ID:         account.ID,
	}

	if err := repository.UserRepository.Update(context.TODO(), u); err != nil {
		return err
	}

	return Success(c, nil)
}

func (api AccountApi) ReloadTOTPEndpoint(c echo.Context) error {
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

func (api AccountApi) ResetTOTPEndpoint(c echo.Context) error {
	account, _ := GetCurrentAccount(c)
	u := &model.User{
		TOTPSecret: "-",
		ID:         account.ID,
	}
	if err := repository.UserRepository.Update(context.TODO(), u); err != nil {
		return err
	}
	return Success(c, "")
}

func (api AccountApi) ChangePasswordEndpoint(c echo.Context) error {
	if config.GlobalCfg.Demo {
		return Fail(c, 0, "演示模式禁止修改密码")
	}
	account, _ := GetCurrentAccount(c)

	var changePassword dto.ChangePassword
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
		ID:       account.ID,
	}

	if err := repository.UserRepository.Update(context.TODO(), u); err != nil {
		return err
	}

	return api.LogoutEndpoint(c)
}

type AccountInfo struct {
	Id         string `json:"id"`
	Username   string `json:"username"`
	Nickname   string `json:"nickname"`
	Type       string `json:"type"`
	EnableTotp bool   `json:"enableTotp"`
}

func (api AccountApi) InfoEndpoint(c echo.Context) error {
	account, _ := GetCurrentAccount(c)

	user, err := repository.UserRepository.FindById(context.TODO(), account.ID)
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

func (api AccountApi) AccountAssetEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	name := c.QueryParam("name")
	protocol := c.QueryParam("protocol")
	tags := c.QueryParam("tags")
	owner := c.QueryParam("owner")
	sharer := c.QueryParam("sharer")
	userGroupId := c.QueryParam("userGroupId")
	ip := c.QueryParam("ip")

	order := c.QueryParam("order")
	field := c.QueryParam("field")
	account, _ := GetCurrentAccount(c)

	items, total, err := repository.AssetRepository.Find(context.TODO(), pageIndex, pageSize, name, protocol, tags, account, owner, sharer, userGroupId, ip, order, field)
	if err != nil {
		return err
	}

	return Success(c, Map{
		"total": total,
		"items": items,
	})
}

func (api AccountApi) AccountStorageEndpoint(c echo.Context) error {
	account, _ := GetCurrentAccount(c)
	storageId := account.ID
	storage, err := repository.StorageRepository.FindById(context.TODO(), storageId)
	if err != nil {
		return err
	}
	structMap := utils.StructToMap(storage)
	drivePath := service.StorageService.GetBaseDrivePath()
	dirSize, err := utils.DirSize(path.Join(drivePath, storageId))
	if err != nil {
		structMap["usedSize"] = -1
	} else {
		structMap["usedSize"] = dirSize
	}

	return Success(c, structMap)
}

func (api AccountApi) AccessTokenGetEndpoint(c echo.Context) error {
	account, _ := GetCurrentAccount(c)
	accessToken, err := repository.AccessTokenRepository.FindByUserId(context.TODO(), account.ID)
	if err != nil {
		if errors.Is(gorm.ErrRecordNotFound, err) {
			accessToken = model.AccessToken{}
		} else {
			return err
		}
	}
	return Success(c, accessToken)
}

func (api AccountApi) AccessTokenGenEndpoint(c echo.Context) error {
	account, _ := GetCurrentAccount(c)
	if err := service.AccessTokenService.GenAccessToken(account.ID); err != nil {
		return err
	}
	return Success(c, nil)
}
