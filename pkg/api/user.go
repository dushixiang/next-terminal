package api

import (
	"github.com/labstack/echo/v4"
	"next-terminal/pkg/global"
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
	password := item.Password

	var pass []byte
	var err error
	if pass, err = utils.Encoder.Encode([]byte(password)); err != nil {
		return err
	}
	item.Password = string(pass)

	item.ID = utils.UUID()
	item.Created = utils.NowJsonTime()

	if err := model.CreateNewUser(&item); err != nil {
		return err
	}

	if item.Mail != "" {
		go model.SendMail(item.Mail, "[Next Terminal] 注册通知", "你好，"+item.Nickname+"。管理员为你注册了账号："+item.Username+" 密码："+password)
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

	items, total, err := model.FindPageUser(pageIndex, pageSize, username, nickname, mail, order, field)
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
		loginLogs, err := model.FindAliveLoginLogsByUserId(userId)
		if err != nil {
			return err
		}
		if loginLogs != nil && len(loginLogs) > 0 {
			for j := range loginLogs {
				global.Cache.Delete(loginLogs[j].ID)
				model.Logout(loginLogs[j].ID)
			}
		}
		// 删除用户
		model.DeleteUserById(userId)
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

func UserChangePasswordEndpoint(c echo.Context) error {
	id := c.Param("id")
	password := c.QueryParam("password")

	user, err := model.FindUserById(id)
	if err != nil {
		return err
	}

	passwd, err := utils.Encoder.Encode([]byte(password))
	if err != nil {
		return err
	}
	u := &model.User{
		Password: string(passwd),
	}
	model.UpdateUserById(u, id)

	if user.Mail != "" {
		go model.SendMail(user.Mail, "[Next Terminal] 密码修改通知", "你好，"+user.Nickname+"。管理员已将你的密码修改为："+password)
	}

	return Success(c, "")
}

func UserResetTotpEndpoint(c echo.Context) error {
	id := c.Param("id")
	u := &model.User{
		TOTPSecret: "-",
	}
	model.UpdateUserById(u, id)
	return Success(c, "")
}
