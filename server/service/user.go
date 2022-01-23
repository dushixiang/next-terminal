package service

import (
	"errors"
	"fmt"
	"strings"

	"next-terminal/server/constant"
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
			ID:       utils.UUID(),
			Username: "admin",
			Password: string(pass),
			Nickname: "超级管理员",
			Type:     constant.TypeAdmin,
			Created:  utils.NowJsonTime(),
			Status:   constant.StatusEnabled,
		}
		if err := repository.UserRepository.Create(context.TODO(), &user); err != nil {
			return err
		}

		log.Infof("初始用户创建成功，账号：「%v」密码：「%v」", user.Username, initPassword)
	} else {
		for i := range users {
			// 修正默认用户类型为管理员
			if users[i].Type == "" {
				user := model.User{
					Type: constant.TypeAdmin,
					ID:   users[i].ID,
				}
				if err := repository.UserRepository.Update(context.TODO(), &user); err != nil {
					return err
				}
				log.Infof("自动修正用户「%v」ID「%v」类型为管理员", users[i].Nickname, users[i].ID)
			}
		}
	}
	return nil
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

func (service userService) LogoutByToken(token string) (err error) {
	return env.GetDB().Transaction(func(tx *gorm.DB) error {
		c := service.Context(tx)
		loginLog, err := repository.LoginLogRepository.FindById(c, token)
		if err != nil {
			return err
		}
		cache.TokenManager.Delete(token)

		loginLogForUpdate := &model.LoginLog{LogoutTime: utils.NowJsonTime(), ID: token}
		err = repository.LoginLogRepository.Update(c, loginLogForUpdate)
		if err != nil {
			return err
		}

		loginLogs, err := repository.LoginLogRepository.FindAliveLoginLogsByUsername(c, loginLog.Username)
		if err != nil {
			return err
		}

		if len(loginLogs) == 0 {
			err = repository.UserRepository.UpdateOnlineByUsername(c, loginLog.Username, false)
		}
		return err
	})
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
		if err := service.LogoutByToken(token); err != nil {
			return err
		}
	}
	return nil
}

func (service userService) OnEvicted(token string, value interface{}) {

	if strings.HasPrefix(token, "forever") {
		log.Debugf("re gen forever token")
	} else {
		log.Debugf("用户Token「%v」过期", token)
		err := service.LogoutByToken(token)
		if err != nil {
			log.Errorf("退出登录失败 %v", err)
		}
	}
}

func (service userService) UpdateStatusById(id string, status string) error {
	return env.GetDB().Transaction(func(tx *gorm.DB) error {
		c := service.Context(tx)
		if c.Value(constant.DB) == nil {
			c = context.WithValue(c, constant.DB, env.GetDB())
		}
		if constant.StatusDisabled == status {
			// 将该用户下线
			if err := service.LogoutById(c, id); err != nil {
				return err
			}
		}
		u := model.User{
			ID:     id,
			Status: status,
		}
		return repository.UserRepository.Update(c, &u)
	})

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
			Type:     constant.LoginToken,
			Remember: loginLog.Remember,
			User:     &user,
		}

		if authorization.Remember {
			// 记住登录有效期两周
			cache.TokenManager.Set(token, authorization, cache.RememberMeExpiration)
		} else {
			cache.TokenManager.Set(token, authorization, cache.NotRememberExpiration)
		}
		log.Debugf("重新加载用户「%v」授权Token「%v」到缓存", user.Nickname, token)
	}
	return nil
}

func (service userService) CreateUser(user model.User) (err error) {
	return env.GetDB().Transaction(func(tx *gorm.DB) error {
		c := service.Context(tx)
		if repository.UserRepository.ExistByUsername(c, user.Username) {
			return fmt.Errorf("username %s is already used", user.Username)
		}
		password := user.Password

		var pass []byte
		if pass, err = utils.Encoder.Encode([]byte(password)); err != nil {
			return err
		}
		user.Password = string(pass)

		user.ID = utils.UUID()
		user.Created = utils.NowJsonTime()
		user.Status = constant.StatusEnabled

		if err := repository.UserRepository.Create(c, &user); err != nil {
			return err
		}
		err = StorageService.CreateStorageByUser(&user)
		if err != nil {
			return err
		}

		if user.Mail != "" {
			go MailService.SendMail(user.Mail, "[Next Terminal] 注册通知", "你好，"+user.Nickname+"。管理员为你注册了账号："+user.Username+" 密码："+password)
		}
		return nil
	})

}

func (service userService) DeleteUserById(userId string) error {
	return env.GetDB().Transaction(func(tx *gorm.DB) error {
		c := service.Context(tx)
		// 下线该用户
		if err := service.LogoutById(c, userId); err != nil {
			return err
		}
		// 删除用户
		if err := repository.UserRepository.DeleteById(c, userId); err != nil {
			return err
		}
		// 删除用户与用户组的关系
		if err := repository.UserGroupMemberRepository.DeleteByUserId(c, userId); err != nil {
			return err
		}
		// 删除用户与资产的关系
		if err := repository.ResourceSharerRepository.DeleteByUserId(c, userId); err != nil {
			return err
		}
		// 删除用户的默认磁盘空间
		if err := StorageService.DeleteStorageById(userId, true); err != nil {
			return err
		}
		return nil
	})
}

func (service userService) DeleteLoginLogs(tokens []string) error {
	if len(tokens) > 0 {
		for _, token := range tokens {
			if err := service.LogoutByToken(token); err != nil {
				return err
			}
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
		LoginTime:       utils.NowJsonTime(),
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
	return repository.UserRepository.DeleteBySource(ctx, constant.SourceLdap)
}
