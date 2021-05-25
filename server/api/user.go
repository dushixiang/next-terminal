package api

import (
	"strconv"
	"strings"

	"next-terminal/pkg/global"
	"next-terminal/pkg/log"
	"next-terminal/server/model"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
)

func UserCreateEndpoint(c echo.Context) error {
	var item model.User
	if err := c.Bind(&item); err != nil {
		return err
	}
	password := item.Password

	var pass []byte
	var err error
	if pass, err = utils.Encoder.Encode([]byte(password)); err != nil {
		return err
	}
	item.Password = string(pass)

	item.ID = utils.UUID()
	item.Created = utils.NowJsonTime()

	if err := userRepository.Create(&item); err != nil {
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
		// 将用户强制下线
		loginLogs, err := loginLogRepository.FindAliveLoginLogsByUserId(userId)
		if err != nil {
			return err
		}

		for j := range loginLogs {
			global.Cache.Delete(loginLogs[j].ID)
			if err := userService.Logout(loginLogs[j].ID); err != nil {
				log.WithError(err).WithField("id:", loginLogs[j].ID).Error("Cache Deleted Error")
				return Fail(c, 500, "强制下线错误")
			}
		}

		// 删除用户
		if err := userRepository.DeleteById(userId); err != nil {
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
	password := c.QueryParam("password")

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
		user, err := userRepository.FindById(loginLog.UserId)
		if err != nil {
			log.Debugf("用户「%v」获取失败，忽略", loginLog.UserId)
			continue
		}

		authorization := Authorization{
			Token:    token,
			Remember: loginLog.Remember,
			User:     user,
		}

		cacheKey := BuildCacheKeyByToken(token)

		if authorization.Remember {
			// 记住登录有效期两周
			global.Cache.Set(cacheKey, authorization, RememberEffectiveTime)
		} else {
			global.Cache.Set(cacheKey, authorization, NotRememberEffectiveTime)
		}
		log.Debugf("重新加载用户「%v」授权Token「%v」到缓存", user.Nickname, token)
	}
	return nil
}
