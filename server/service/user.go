package service

import (
	"errors"
	"fmt"
	"next-terminal/server/common/nt"
	"strings"

	"next-terminal/server/branding"
	"next-terminal/server/common"
	"next-terminal/server/dto"
	"next-terminal/server/env"
	"next-terminal/server/global/cache"
	"next-terminal/server/log"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"

	"golang.org/x/net/context"
	"gorm.io/gorm"
)

const SuperAdminID = `abcdefghijklmnopqrstuvwxyz`

var UserService = new(userService)

type userService struct {
	baseService
}

func (service userService) InitUser() (err error) {

	users, err := repository.UserRepository.FindAll(context.TODO())
	if err != nil {
		return err
	}

	if len(users) == 0 {
		initPassword := "admin"
		var pass []byte
		if pass, err = utils.Encoder.Encode([]byte(initPassword)); err != nil {
			return err
		}

		user := model.User{
			ID:       SuperAdminID,
			Username: "admin",
			Password: string(pass),
			Nickname: "超级管理员",
			Type:     nt.TypeAdmin,
			Created:  common.NowJsonTime(),
			Status:   nt.StatusEnabled,
		}
		if err := repository.UserRepository.Create(context.TODO(), &user); err != nil {
			return err
		}

	} else {
		for i := range users {
			// 修正默认用户类型为管理员
			if users[i].Type == "" {
				user := model.User{
					Type: nt.TypeUser,
					ID:   users[i].ID,
				}
				if err := repository.UserRepository.Update(context.TODO(), &user); err != nil {
					return err
				}
			}

			if users[i].Type == nt.TypeAdmin {
				roles, err := RoleService.GetRolesByUserId(users[i].ID)
				if err != nil {
					return err
				}
				if len(roles) == 0 {
					users[i].Roles = []string{"system-administrator"}
					if err := service.saveUserRoles(context.Background(), users[i]); err != nil {
						return err
					}
				}
			}
		}
	}
	return nil
}

func (service userService) IsSuperAdmin(userId string) bool {
	return SuperAdminID == userId
}

func (service userService) FixUserOnlineState() error {
	// 修正用户登录状态
	onlineUsers, err := repository.UserRepository.FindOnlineUsers(context.TODO())
	if err != nil {
		return err
	}
	if len(onlineUsers) > 0 {
		for i := range onlineUsers {
			logs, err := repository.LoginLogRepository.FindAliveLoginLogsByUsername(context.TODO(), onlineUsers[i].Username)
			if err != nil {
				return err
			}
			if len(logs) == 0 {
				if err := repository.UserRepository.UpdateOnlineByUsername(context.TODO(), onlineUsers[i].Username, false); err != nil {
					return err
				}
			}
		}
	}
	return nil
}

func (service userService) Logout(token string) {
	cache.TokenManager.Delete(token)
}

func (service userService) LogoutByToken(token string) (err error) {
	loginLog, err := repository.LoginLogRepository.FindById(context.TODO(), token)
	if err != nil {
		return err
	}

	loginLogForUpdate := &model.LoginLog{LogoutTime: common.NowJsonTime(), ID: token}
	err = repository.LoginLogRepository.Update(context.TODO(), loginLogForUpdate)
	if err != nil {
		return err
	}

	loginLogs, err := repository.LoginLogRepository.FindAliveLoginLogsByUsername(context.TODO(), loginLog.Username)
	if err != nil {
		return err
	}

	if len(loginLogs) == 0 {
		err = repository.UserRepository.UpdateOnlineByUsername(context.TODO(), loginLog.Username, false)
	}
	return err
}

func (service userService) LogoutById(c context.Context, id string) error {
	user, err := repository.UserRepository.FindById(c, id)
	if err != nil {
		return err
	}
	username := user.Username
	loginLogs, err := repository.LoginLogRepository.FindAliveLoginLogsByUsername(c, username)
	if err != nil {
		return err
	}

	for j := range loginLogs {
		token := loginLogs[j].ID
		service.Logout(token)
	}
	return nil
}

func (service userService) GetUserLoginToken(c context.Context, username string) ([]string, error) {

	loginLogs, err := repository.LoginLogRepository.FindAliveLoginLogsByUsername(c, username)
	if err != nil {
		return nil, err
	}

	var tokens []string
	for j := range loginLogs {
		token := loginLogs[j].ID
		tokens = append(tokens, token)
	}
	return tokens, nil
}

func (service userService) OnEvicted(token string, value interface{}) {

	if strings.HasPrefix(token, "forever") {
	} else {
		err := service.LogoutByToken(token)
		if err != nil && !errors.Is(gorm.ErrRecordNotFound, err) {
		}
	}
}

func (service userService) UpdateStatusById(id string, status string) error {
	if nt.StatusDisabled == status {
		// 将该用户下线
		if err := service.LogoutById(context.TODO(), id); err != nil {
			return err
		}
	}
	u := model.User{
		ID:     id,
		Status: status,
	}
	return repository.UserRepository.Update(context.TODO(), &u)

}

func (service userService) ReloadToken() error {
	loginLogs, err := repository.LoginLogRepository.FindAliveLoginLogs(context.TODO())
	if err != nil {
		return err
	}

	for i := range loginLogs {
		loginLog := loginLogs[i]
		token := loginLog.ID
		user, err := repository.UserRepository.FindByUsername(context.TODO(), loginLog.Username)
		if err != nil {
			if errors.Is(gorm.ErrRecordNotFound, err) {
				_ = repository.LoginLogRepository.DeleteById(context.TODO(), token)
			}
			continue
		}

		authorization := dto.Authorization{
			Token:    token,
			Type:     nt.LoginToken,
			Remember: loginLog.Remember,
			User:     &user,
		}

		if authorization.Remember {
			// 记住登录有效期两周
			cache.TokenManager.Set(token, authorization, cache.RememberMeExpiration)
		} else {
			cache.TokenManager.Set(token, authorization, cache.NotRememberExpiration)
		}
		log.Debug("重新加载用户授权Token", log.String("username", user.Nickname), log.String("token", token))
	}
	return nil
}

func (service userService) CreateUser(user model.User) (err error) {
	return env.GetDB().Transaction(func(tx *gorm.DB) error {
		c := service.Context(tx)
		exist, err := repository.UserRepository.ExistByUsername(c, user.Username)
		if err != nil {
			return err
		}
		if exist {
			return fmt.Errorf("username %s is already used", user.Username)
		}
		password := user.Password

		var pass []byte
		if pass, err = utils.Encoder.Encode([]byte(password)); err != nil {
			return err
		}
		user.Password = string(pass)

		user.ID = utils.UUID()
		user.Created = common.NowJsonTime()
		user.Status = nt.StatusEnabled

		if err := repository.UserRepository.Create(c, &user); err != nil {
			return err
		}
		if err := service.saveUserRoles(c, user); err != nil {
			return err
		}
		if err := StorageService.CreateStorageByUser(c, &user); err != nil {
			return err
		}

		if user.Mail != "" {
			subject := fmt.Sprintf("%s 注册通知", branding.Name)
			text := fmt.Sprintf(`您好，%s。
	管理员为你开通了账户。
	账号：%s
	密码：%s
`, user.Username, user.Username, password)
			go MailService.SendMail(user.Mail, subject, text)
		}
		return nil
	})

}

func (service userService) saveUserRoles(c context.Context, user model.User) error {
	for _, role := range user.Roles {
		ref := &model.UserRoleRef{
			ID:     utils.UUID(),
			UserId: user.ID,
			RoleId: role,
		}
		if err := repository.UserRoleRefRepository.Create(c, ref); err != nil {
			return err
		}
	}
	return nil
}

func (service userService) DeleteUserById(userId string) error {
	user, err := repository.UserRepository.FindById(context.TODO(), userId)
	if err != nil {
		return err
	}
	username := user.Username
	// 下线该用户
	loginTokens, err := service.GetUserLoginToken(context.TODO(), username)
	if err != nil {
		return err
	}

	err = env.GetDB().Transaction(func(tx *gorm.DB) error {
		c := service.Context(tx)
		// 删除用户与用户组的关系
		if err := repository.UserGroupMemberRepository.DeleteByUserId(c, userId); err != nil {
			return err
		}
		// 删除用户与资产的关系
		if err := repository.AuthorisedRepository.DeleteByUserId(c, userId); err != nil {
			return err
		}
		// 删除用户的默认磁盘空间
		if err := StorageService.DeleteStorageById(c, userId, true); err != nil {
			return err
		}
		// 删除用户与角色的关系
		if err := repository.UserRoleRefRepository.DeleteByUserId(c, user.ID); err != nil {
			return err
		}
		// 删除用户
		if err := repository.UserRepository.DeleteById(c, userId); err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		return err
	}

	for _, token := range loginTokens {
		service.Logout(token)
	}
	return nil
}

func (service userService) DeleteLoginLogs(tokens []string) error {
	if len(tokens) > 0 {
		for _, token := range tokens {
			// 手动触发用户退出登录
			if err := service.LogoutByToken(token); err != nil {
				return err
			}
			// 移除缓存中的token
			service.Logout(token)
			// 删除登录日志
			if err := repository.LoginLogRepository.DeleteById(context.TODO(), token); err != nil {
				return err
			}
		}
	}
	return nil
}

func (service userService) SaveLoginLog(clientIP, clientUserAgent string, username string, success, remember bool, id, reason string) error {
	loginLog := model.LoginLog{
		Username:        username,
		ClientIP:        clientIP,
		ClientUserAgent: clientUserAgent,
		LoginTime:       common.NowJsonTime(),
		Reason:          reason,
		Remember:        remember,
	}
	if success {
		loginLog.State = "1"
		loginLog.ID = id
	} else {
		loginLog.State = "0"
		loginLog.ID = utils.LongUUID()
	}

	if err := repository.LoginLogRepository.Create(context.TODO(), &loginLog); err != nil {
		return err
	}
	return nil
}

func (service userService) DeleteALlLdapUser(ctx context.Context) error {
	return repository.UserRepository.DeleteBySource(ctx, nt.SourceLdap)
}

func (service userService) UpdateUser(id string, user model.User) error {

	return env.GetDB().Transaction(func(tx *gorm.DB) error {
		ctx := service.Context(tx)

		dbUser, err := repository.UserRepository.FindById(ctx, id)
		if err != nil {
			return err
		}

		if dbUser.Username != user.Username {
			// 修改了登录账号
			exist, err := repository.UserRepository.ExistByUsername(ctx, user.Username)
			if err != nil {
				return err
			}
			if exist {
				return fmt.Errorf("username %s is already used", user.Username)
			}
		}

		if err := repository.UserRoleRefRepository.DeleteByUserId(ctx, user.ID); err != nil {
			return err
		}

		if err := service.saveUserRoles(ctx, user); err != nil {
			return err
		}

		// 移除用户角色的缓存
		cache.UserRolesManager.Delete(id)

		return repository.UserRepository.Update(ctx, &user)
	})

}

func (service userService) FindById(id string) (*model.User, error) {
	item, err := repository.UserRepository.FindById(context.TODO(), id)
	if err != nil {
		return nil, err
	}

	roles, err := RoleService.GetRolesByUserId(id)
	if err != nil {
		return nil, err
	}
	item.Roles = roles

	return &item, nil
}

func (service userService) ResetTotp(ids []string) error {
	return service.Transaction(context.Background(), func(ctx context.Context) error {
		for _, id := range ids {
			u := &model.User{
				TOTPSecret: "-",
				ID:         id,
			}
			if err := repository.UserRepository.Update(ctx, u); err != nil {
				return err
			}
		}
		return nil
	})
}

func (service userService) ChangePassword(ids []string, password string) error {

	passwd, err := utils.Encoder.Encode([]byte(password))
	if err != nil {
		return err
	}

	return service.Transaction(context.Background(), func(ctx context.Context) error {
		for _, id := range ids {
			u := &model.User{
				Password: string(passwd),
				ID:       id,
			}
			if err := repository.UserRepository.Update(ctx, u); err != nil {
				return err
			}

			user, err := repository.UserRepository.FindById(ctx, id)
			if err != nil {
				return err
			}

			if user.Mail != "" {
				subject := "密码修改通知"
				text := fmt.Sprintf(`您好，%s。
	管理员已将你的密码修改为：%s。
`, user.Username, password)
				go MailService.SendMail(user.Mail, subject, text)
			}
		}

		return nil
	})
}
