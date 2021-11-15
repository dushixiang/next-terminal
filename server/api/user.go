package api

import (
	"errors"
	"strconv"
	"strings"

	"next-terminal/server/constant"
	"next-terminal/server/global/cache"
	"next-terminal/server/log"
	"next-terminal/server/model"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func UserCreateEndpoint(c echo.Context) (err error) {
	var item model.User
	if err := c.Bind(&item); err != nil {
		return err
	}
	if userRepository.ExistByUsername(item.Username) {
		return Fail(c, -1, "username is already in use")
	}

	password := item.Password

	var pass []byte
	if pass, err = utils.Encoder.Encode([]byte(password)); err != nil {
		return err
	}
	item.Password = string(pass)

	item.ID = utils.UUID()
	item.Created = utils.NowJsonTime()
	item.Status = constant.StatusEnabled

	if err := userRepository.Create(&item); err != nil {
		return err
	}
	err = storageService.CreateStorageByUser(&item)
	if err != nil {
		return err
	}

	if item.Mail != "" {
		go mailService.SendMail(item.Mail, "[Next Terminal] 注册通知", "你好，"+item.Nickname+"。管理员为你注册了账号："+item.Username+" 密码："+password)
	}
	return Success(c, item)
}

func UserPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	username := c.QueryParam("username")
	nickname := c.QueryParam("nickname")
	mail := c.QueryParam("mail")

	order := c.QueryParam("order")
	field := c.QueryParam("field")

	account, _ := GetCurrentAccount(c)
	items, total, err := userRepository.Find(pageIndex, pageSize, username, nickname, mail, order, field, account)
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

	account, _ := GetCurrentAccount(c)
	if account.ID == id {
		return Fail(c, -1, "cannot modify itself")
	}

	var item model.User
	if err := c.Bind(&item); err != nil {
		return err
	}
	item.ID = id

	if err := userRepository.Update(&item); err != nil {
		return err
	}

	return Success(c, nil)
}

func UserUpdateStatusEndpoint(c echo.Context) error {
	id := c.Param("id")
	status := c.QueryParam("status")
	account, _ := GetCurrentAccount(c)
	if account.ID == id {
		return Fail(c, -1, "不能操作自身账户")
	}

	if err := userService.UpdateStatusById(id, status); err != nil {
		return err
	}

	return Success(c, nil)
}

func UserDeleteEndpoint(c echo.Context) error {
	ids := c.Param("id")
	account, found := GetCurrentAccount(c)
	if !found {
		return Fail(c, -1, "获取当前登录账户失败")
	}
	split := strings.Split(ids, ",")
	for i := range split {
		userId := split[i]
		if account.ID == userId {
			return Fail(c, -1, "不允许删除自身账户")
		}
		// 下线该用户
		if err := userService.LogoutById(userId); err != nil {
			return err
		}
		// 删除用户
		if err := userRepository.DeleteById(userId); err != nil {
			return err
		}
		// 删除用户的默认磁盘空间
		if err := storageService.DeleteStorageById(userId, true); err != nil {
			return err
		}
	}

	return Success(c, nil)
}

func UserGetEndpoint(c echo.Context) error {
	id := c.Param("id")

	item, err := userRepository.FindById(id)
	if err != nil {
		return err
	}

	return Success(c, item)
}

func UserChangePasswordEndpoint(c echo.Context) error {
	id := c.Param("id")
	password := c.FormValue("password")
	if password == "" {
		return Fail(c, -1, "请输入密码")
	}

	user, err := userRepository.FindById(id)
	if err != nil {
		return err
	}

	passwd, err := utils.Encoder.Encode([]byte(password))
	if err != nil {
		return err
	}
	u := &model.User{
		Password: string(passwd),
		ID:       id,
	}
	if err := userRepository.Update(u); err != nil {
		return err
	}

	if user.Mail != "" {
		go mailService.SendMail(user.Mail, "[Next Terminal] 密码修改通知", "你好，"+user.Nickname+"。管理员已将你的密码修改为："+password)
	}

	return Success(c, "")
}

func UserResetTotpEndpoint(c echo.Context) error {
	id := c.Param("id")
	u := &model.User{
		TOTPSecret: "-",
		ID:         id,
	}
	if err := userRepository.Update(u); err != nil {
		return err
	}
	return Success(c, "")
}

func ReloadToken() error {
	loginLogs, err := loginLogRepository.FindAliveLoginLogs()
	if err != nil {
		return err
	}

	for i := range loginLogs {
		loginLog := loginLogs[i]
		token := loginLog.ID
		user, err := userRepository.FindByUsername(loginLog.Username)
		if err != nil {
			if errors.Is(gorm.ErrRecordNotFound, err) {
				_ = loginLogRepository.DeleteById(token)
			}
			continue
		}

		authorization := Authorization{
			Token:    token,
			Remember: loginLog.Remember,
			User:     user,
		}

		cacheKey := userService.BuildCacheKeyByToken(token)

		if authorization.Remember {
			// 记住登录有效期两周
			cache.GlobalCache.Set(cacheKey, authorization, RememberEffectiveTime)
		} else {
			cache.GlobalCache.Set(cacheKey, authorization, NotRememberEffectiveTime)
		}
		log.Debugf("重新加载用户「%v」授权Token「%v」到缓存", user.Nickname, token)
	}
	return nil
}
