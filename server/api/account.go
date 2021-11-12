package api

import (
	"next-terminal/server/constant"
	"path"
	"strconv"
	"strings"
	"time"

	"next-terminal/server/config"
	"next-terminal/server/global/cache"
	"next-terminal/server/model"
	"next-terminal/server/totp"
	"next-terminal/server/utils"

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

	// 存储登录失败次数信息
	loginFailCountKey := c.RealIP() + loginAccount.Username
	v, ok := cache.GlobalCache.Get(loginFailCountKey)
	if !ok {
		v = 1
	}
	count := v.(int)
	if count >= 5 {
		return Fail(c, -1, "登录失败次数过多，请等待5分钟后再试")
	}

	user, err := userRepository.FindByUsername(loginAccount.Username)
	if err != nil {
		count++
		cache.GlobalCache.Set(loginFailCountKey, count, time.Minute*time.Duration(5))
		// 保存登录日志
		if err := SaveLoginLog(c.RealIP(), c.Request().UserAgent(), loginAccount.Username, false, loginAccount.Remember, "", "账号或密码不正确"); err != nil {
			return err
		}
		return FailWithData(c, -1, "您输入的账号或密码不正确", count)
	}

	if user.Status == constant.StatusDisabled {
		return Fail(c, -1, "该账户已停用")
	}

	if err := utils.Encoder.Match([]byte(user.Password), []byte(loginAccount.Password)); err != nil {
		count++
		cache.GlobalCache.Set(loginFailCountKey, count, time.Minute*time.Duration(5))
		// 保存登录日志
		if err := SaveLoginLog(c.RealIP(), c.Request().UserAgent(), loginAccount.Username, false, loginAccount.Remember, "", "账号或密码不正确"); err != nil {
			return err
		}
		return FailWithData(c, -1, "您输入的账号或密码不正确", count)
	}

	if user.TOTPSecret != "" && user.TOTPSecret != "-" {
		return Fail(c, 0, "")
	}

	token, err := LoginSuccess(loginAccount, user)
	if err != nil {
		return err
	}
	// 保存登录日志
	if err := SaveLoginLog(c.RealIP(), c.Request().UserAgent(), loginAccount.Username, true, loginAccount.Remember, token, ""); err != nil {
		return err
	}

	return Success(c, token)
}

func SaveLoginLog(clientIP, clientUserAgent string, username string, success, remember bool, id, reason string) error {
	loginLog := model.LoginLog{
		Username:        username,
		ClientIP:        clientIP,
		ClientUserAgent: clientUserAgent,
		LoginTime:       utils.NowJsonTime(),
		Reason:          reason,
		Remember:        remember,
	}
	if success {
		loginLog.State = "1"
		loginLog.ID = id
	} else {
		loginLog.State = "0"
		loginLog.ID = utils.UUID()
	}

	if err := loginLogRepository.Create(&loginLog); err != nil {
		return err
	}
	return nil
}

func LoginSuccess(loginAccount LoginAccount, user model.User) (token string, err error) {
	token = strings.Join([]string{utils.UUID(), utils.UUID(), utils.UUID(), utils.UUID()}, "")

	authorization := Authorization{
		Token:    token,
		Remember: loginAccount.Remember,
		User:     user,
	}

	cacheKey := userService.BuildCacheKeyByToken(token)

	if authorization.Remember {
		// 记住登录有效期两周
		cache.GlobalCache.Set(cacheKey, authorization, RememberEffectiveTime)
	} else {
		cache.GlobalCache.Set(cacheKey, authorization, NotRememberEffectiveTime)
	}

	// 修改登录状态
	err = userRepository.Update(&model.User{Online: true, ID: user.ID})
	return token, err
}

func loginWithTotpEndpoint(c echo.Context) error {
	var loginAccount LoginAccount
	if err := c.Bind(&loginAccount); err != nil {
		return err
	}

	// 存储登录失败次数信息
	loginFailCountKey := c.RealIP() + loginAccount.Username
	v, ok := cache.GlobalCache.Get(loginFailCountKey)
	if !ok {
		v = 1
	}
	count := v.(int)
	if count >= 5 {
		return Fail(c, -1, "登录失败次数过多，请等待5分钟后再试")
	}

	user, err := userRepository.FindByUsername(loginAccount.Username)
	if err != nil {
		count++
		cache.GlobalCache.Set(loginFailCountKey, count, time.Minute*time.Duration(5))
		// 保存登录日志
		if err := SaveLoginLog(c.RealIP(), c.Request().UserAgent(), loginAccount.Username, false, loginAccount.Remember, "", "账号或密码不正确"); err != nil {
			return err
		}
		return FailWithData(c, -1, "您输入的账号或密码不正确", count)
	}

	if user.Status == constant.StatusDisabled {
		return Fail(c, -1, "该账户已停用")
	}

	if err := utils.Encoder.Match([]byte(user.Password), []byte(loginAccount.Password)); err != nil {
		count++
		cache.GlobalCache.Set(loginFailCountKey, count, time.Minute*time.Duration(5))
		// 保存登录日志
		if err := SaveLoginLog(c.RealIP(), c.Request().UserAgent(), loginAccount.Username, false, loginAccount.Remember, "", "账号或密码不正确"); err != nil {
			return err
		}
		return FailWithData(c, -1, "您输入的账号或密码不正确", count)
	}

	if !totp.Validate(loginAccount.TOTP, user.TOTPSecret) {
		count++
		cache.GlobalCache.Set(loginFailCountKey, count, time.Minute*time.Duration(5))
		// 保存登录日志
		if err := SaveLoginLog(c.RealIP(), c.Request().UserAgent(), loginAccount.Username, false, loginAccount.Remember, "", "双因素认证授权码不正确"); err != nil {
			return err
		}
		return FailWithData(c, -1, "您输入双因素认证授权码不正确", count)
	}

	token, err := LoginSuccess(loginAccount, user)
	if err != nil {
		return err
	}
	// 保存登录日志
	if err := SaveLoginLog(c.RealIP(), c.Request().UserAgent(), loginAccount.Username, true, loginAccount.Remember, token, ""); err != nil {
		return err
	}

	return Success(c, token)
}

func LogoutEndpoint(c echo.Context) error {
	token := GetToken(c)
	err := userService.LogoutByToken(token)
	if err != nil {
		return err
	}
	return Success(c, nil)
}

func ConfirmTOTPEndpoint(c echo.Context) error {
	if config.GlobalCfg.Demo {
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
		ID:         account.ID,
	}

	if err := userRepository.Update(u); err != nil {
		return err
	}

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
		ID:         account.ID,
	}
	if err := userRepository.Update(u); err != nil {
		return err
	}
	return Success(c, "")
}

func ChangePasswordEndpoint(c echo.Context) error {
	if config.GlobalCfg.Demo {
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
		ID:       account.ID,
	}

	if err := userRepository.Update(u); err != nil {
		return err
	}

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

	user, err := userRepository.FindById(account.ID)
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

func AccountAssetEndpoint(c echo.Context) error {
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

	items, total, err := assetRepository.Find(pageIndex, pageSize, name, protocol, tags, account, owner, sharer, userGroupId, ip, order, field)
	if err != nil {
		return err
	}

	return Success(c, H{
		"total": total,
		"items": items,
	})
}

func AccountStorageEndpoint(c echo.Context) error {
	account, _ := GetCurrentAccount(c)
	storageId := account.ID
	storage, err := storageRepository.FindById(storageId)
	if err != nil {
		return err
	}
	structMap := utils.StructToMap(storage)
	drivePath := storageService.GetBaseDrivePath()
	dirSize, err := utils.DirSize(path.Join(drivePath, storageId))
	if err != nil {
		structMap["usedSize"] = -1
	} else {
		structMap["usedSize"] = dirSize
	}

	return Success(c, structMap)
}
