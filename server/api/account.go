package api

import (
	"context"
	"errors"
	"next-terminal/server/common"
	"next-terminal/server/common/maps"
	"next-terminal/server/common/nt"
	"path"
	"strings"

	"next-terminal/server/config"
	"next-terminal/server/dto"
	"next-terminal/server/global/cache"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/service"
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

	if len(loginAccount.Password) > 100 {
		return Fail(c, -1, "您输入的密码过长")
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

	if user.Status == nt.StatusDisabled {
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

	// 账号密码正确，需要进行两步验证
	if user.TOTPSecret != "" && user.TOTPSecret != "-" {
		if loginAccount.TOTP == "" {
			return Fail(c, 100, "")
		} else {
			if !common.Validate(loginAccount.TOTP, user.TOTPSecret) {
				count++
				cache.LoginFailedKeyManager.Set(loginFailCountKey, count, cache.LoginLockExpiration)
				// 保存登录日志
				if err := service.UserService.SaveLoginLog(c.RealIP(), c.Request().UserAgent(), loginAccount.Username, false, loginAccount.Remember, "", "双因素认证授权码不正确"); err != nil {
					return err
				}
				return FailWithData(c, -1, "您输入双因素认证授权码不正确", count)
			}
		}
	}

	token, err := api.LoginSuccess(loginAccount, user, c.RealIP())
	if err != nil {
		return err
	}
	// 保存登录日志
	if err := service.UserService.SaveLoginLog(c.RealIP(), c.Request().UserAgent(), loginAccount.Username, true, loginAccount.Remember, token, ""); err != nil {
		return err
	}

	var menus []string
	if service.UserService.IsSuperAdmin(user.ID) {
		menus = service.MenuService.GetMenus()
	} else {
		roles, err := service.RoleService.GetRolesByUserId(user.ID)
		if err != nil {
			return err
		}
		for _, role := range roles {
			items := service.RoleService.GetMenuListByRole(role)
			menus = append(menus, items...)
		}
	}

	info := AccountInfo{
		Id:         user.ID,
		Username:   user.Username,
		Nickname:   user.Nickname,
		Type:       user.Type,
		EnableTotp: user.TOTPSecret != "" && user.TOTPSecret != "-",
		Roles:      user.Roles,
		Menus:      menus,
	}

	return Success(c, maps.Map{
		"info":  info,
		"token": token,
	})
}

func (api AccountApi) LoginSuccess(loginAccount dto.LoginAccount, user model.User, ip string) (string, error) {
	// 判断当前时间是否允许该用户登录
	if err := service.LoginPolicyService.Check(user.ID, ip); err != nil {
		return "", err
	}

	token := utils.LongUUID()

	authorization := dto.Authorization{
		Token:    token,
		Type:     nt.LoginToken,
		Remember: loginAccount.Remember,
		User:     &user,
	}

	if authorization.Remember {
		// 记住登录有效期两周
		cache.TokenManager.Set(token, authorization, cache.RememberMeExpiration)
	} else {
		cache.TokenManager.Set(token, authorization, cache.NotRememberExpiration)
	}

	b := true
	// 修改登录状态
	err := repository.UserRepository.Update(context.TODO(), &model.User{Online: &b, ID: user.ID})
	return token, err
}

func (api AccountApi) LogoutEndpoint(c echo.Context) error {
	token := GetToken(c)
	service.UserService.Logout(token)
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

	if !common.Validate(confirmTOTP.TOTP, confirmTOTP.Secret) {
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

	key, err := common.NewTOTP(common.GenerateOpts{
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

	if len(changePassword.NewPassword) > 100 {
		return Fail(c, -1, "您输入的密码过长")
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
	Id         string   `json:"id"`
	Username   string   `json:"username"`
	Nickname   string   `json:"nickname"`
	Type       string   `json:"type"`
	EnableTotp bool     `json:"enableTotp"`
	Roles      []string `json:"roles"`
	Menus      []string `json:"menus"`
}

func (api AccountApi) InfoEndpoint(c echo.Context) error {
	account, _ := GetCurrentAccount(c)
	if strings.EqualFold("anonymous", account.Type) {
		return Success(c, account)
	}

	user, err := service.UserService.FindById(account.ID)
	if err != nil {
		return err
	}

	var menus []string
	if service.UserService.IsSuperAdmin(account.ID) {
		menus = service.MenuService.GetMenus()
	} else {
		roles, err := service.RoleService.GetRolesByUserId(account.ID)
		if err != nil {
			return err
		}
		for _, role := range roles {
			items := service.RoleService.GetMenuListByRole(role)
			menus = append(menus, items...)
		}
	}

	info := AccountInfo{
		Id:         user.ID,
		Username:   user.Username,
		Nickname:   user.Nickname,
		Type:       user.Type,
		EnableTotp: user.TOTPSecret != "" && user.TOTPSecret != "-",
		Roles:      user.Roles,
		Menus:      menus,
	}
	return Success(c, info)
}

func (api AccountApi) MenuEndpoint(c echo.Context) error {
	account, _ := GetCurrentAccount(c)
	if service.UserService.IsSuperAdmin(account.ID) {
		items := service.MenuService.GetMenus()
		return Success(c, items)
	}
	roles, err := service.RoleService.GetRolesByUserId(account.ID)
	if err != nil {
		return err
	}
	var menus []string
	for _, role := range roles {
		items := service.RoleService.GetMenuListByRole(role)
		menus = append(menus, items...)
	}
	return Success(c, menus)
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

func (api AccountApi) AccessTokenDelEndpoint(c echo.Context) error {
	account, _ := GetCurrentAccount(c)
	if err := service.AccessTokenService.DelAccessToken(context.Background(), account.ID); err != nil {
		return err
	}
	return Success(c, nil)
}
