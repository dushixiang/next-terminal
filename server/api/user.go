package api

import (
	"context"

	"strconv"
	"strings"

	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/service"
	"next-terminal/server/utils"

	"github.com/labstack/echo/v4"
)

type UserApi struct{}

func (userApi UserApi) UserCreateEndpoint(c echo.Context) (err error) {
	var item model.User
	if err := c.Bind(&item); err != nil {
		return err
	}

	if err := service.UserService.CreateUser(item); err != nil {
		return err
	}

	return Success(c, item)
}

func (userApi UserApi) UserPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	username := c.QueryParam("username")
	nickname := c.QueryParam("nickname")
	mail := c.QueryParam("mail")

	order := c.QueryParam("order")
	field := c.QueryParam("field")

	items, total, err := repository.UserRepository.Find(context.TODO(), pageIndex, pageSize, username, nickname, mail, order, field)
	if err != nil {
		return err
	}

	return Success(c, Map{
		"total": total,
		"items": items,
	})
}

func (userApi UserApi) UserUpdateEndpoint(c echo.Context) error {
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

	if err := repository.UserRepository.Update(context.TODO(), &item); err != nil {
		return err
	}

	return Success(c, nil)
}

func (userApi UserApi) UserUpdateStatusEndpoint(c echo.Context) error {
	id := c.Param("id")
	status := c.QueryParam("status")
	account, _ := GetCurrentAccount(c)
	if account.ID == id {
		return Fail(c, -1, "不能操作自身账户")
	}

	if err := service.UserService.UpdateStatusById(id, status); err != nil {
		return err
	}

	return Success(c, nil)
}

func (userApi UserApi) UserDeleteEndpoint(c echo.Context) error {
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
		if err := service.UserService.DeleteUserById(userId); err != nil {
			return err
		}
	}

	return Success(c, nil)
}

func (userApi UserApi) UserGetEndpoint(c echo.Context) error {
	id := c.Param("id")

	item, err := repository.UserRepository.FindById(context.TODO(), id)
	if err != nil {
		return err
	}

	return Success(c, item)
}

func (userApi UserApi) UserChangePasswordEndpoint(c echo.Context) error {
	id := c.Param("id")
	password := c.FormValue("password")
	if password == "" {
		return Fail(c, -1, "请输入密码")
	}

	user, err := repository.UserRepository.FindById(context.TODO(), id)
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
	if err := repository.UserRepository.Update(context.TODO(), u); err != nil {
		return err
	}

	if user.Mail != "" {
		go service.MailService.SendMail(user.Mail, "[Next Terminal] 密码修改通知", "你好，"+user.Nickname+"。管理员已将你的密码修改为："+password)
	}

	return Success(c, "")
}

func (userApi UserApi) UserResetTotpEndpoint(c echo.Context) error {
	id := c.Param("id")
	u := &model.User{
		TOTPSecret: "-",
		ID:         id,
	}
	if err := repository.UserRepository.Update(context.TODO(), u); err != nil {
		return err
	}
	return Success(c, "")
}
