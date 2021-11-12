package service

import (
	"next-terminal/server/global/cache"
	"strings"

	"next-terminal/server/constant"
	"next-terminal/server/log"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"
)

type UserService struct {
	userRepository     *repository.UserRepository
	loginLogRepository *repository.LoginLogRepository
}

func NewUserService(userRepository *repository.UserRepository, loginLogRepository *repository.LoginLogRepository) *UserService {
	return &UserService{userRepository: userRepository, loginLogRepository: loginLogRepository}
}

func (r UserService) InitUser() (err error) {

	users, err := r.userRepository.FindAll()
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
		if err := r.userRepository.Create(&user); err != nil {
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
				if err := r.userRepository.Update(&user); err != nil {
					return err
				}
				log.Infof("自动修正用户「%v」ID「%v」类型为管理员", users[i].Nickname, users[i].ID)
			}
		}
	}
	return nil
}

func (r UserService) FixUserOnlineState() error {
	// 修正用户登录状态
	onlineUsers, err := r.userRepository.FindOnlineUsers()
	if err != nil {
		return err
	}
	if len(onlineUsers) > 0 {
		for i := range onlineUsers {
			logs, err := r.loginLogRepository.FindAliveLoginLogsByUsername(onlineUsers[i].Username)
			if err != nil {
				return err
			}
			if len(logs) == 0 {
				if err := r.userRepository.UpdateOnlineByUsername(onlineUsers[i].Username, false); err != nil {
					return err
				}
			}
		}
	}
	return nil
}

func (r UserService) LogoutByToken(token string) (err error) {
	loginLog, err := r.loginLogRepository.FindById(token)
	if err != nil {
		log.Warnf("登录日志「%v」获取失败", token)
		return
	}
	cacheKey := r.BuildCacheKeyByToken(token)
	cache.GlobalCache.Delete(cacheKey)

	loginLogForUpdate := &model.LoginLog{LogoutTime: utils.NowJsonTime(), ID: token}
	err = r.loginLogRepository.Update(loginLogForUpdate)
	if err != nil {
		return err
	}

	loginLogs, err := r.loginLogRepository.FindAliveLoginLogsByUsername(loginLog.Username)
	if err != nil {
		return
	}

	if len(loginLogs) == 0 {
		err = r.userRepository.UpdateOnlineByUsername(loginLog.Username, false)
	}
	return
}

func (r UserService) LogoutById(id string) error {
	user, err := r.userRepository.FindById(id)
	if err != nil {
		return err
	}
	username := user.Username
	loginLogs, err := r.loginLogRepository.FindAliveLoginLogsByUsername(username)
	if err != nil {
		return err
	}

	for j := range loginLogs {
		token := loginLogs[j].ID
		if err := r.LogoutByToken(token); err != nil {
			return err
		}
	}
	return nil
}

func (r UserService) BuildCacheKeyByToken(token string) string {
	cacheKey := strings.Join([]string{constant.Token, token}, ":")
	return cacheKey
}

func (r UserService) GetTokenFormCacheKey(cacheKey string) string {
	token := strings.Split(cacheKey, ":")[1]
	return token
}

func (r UserService) OnEvicted(key string, value interface{}) {
	if strings.HasPrefix(key, constant.Token) {
		token := r.GetTokenFormCacheKey(key)
		log.Debugf("用户Token「%v」过期", token)
		err := r.LogoutByToken(token)
		if err != nil {
			log.Errorf("退出登录失败 %v", err)
		}
	}
}

func (r UserService) UpdateStatusById(id string, status string) error {
	if constant.StatusDisabled == status {
		// 将该用户下线
		if err := r.LogoutById(id); err != nil {
			return err
		}
	}
	u := model.User{
		ID:     id,
		Status: status,
	}
	return r.userRepository.Update(&u)
}

func (r UserService) DeleteLoginLogs(tokens []string) error {
	for i := range tokens {
		token := tokens[i]
		if err := r.LogoutByToken(token); err != nil {
			return err
		}
		if err := r.loginLogRepository.DeleteById(token); err != nil {
			return err
		}
	}
	return nil
}
