package task

import (
	"strconv"
	"time"

	"next-terminal/server/constant"
	"next-terminal/server/log"
	"next-terminal/server/repository"
)

type Ticker struct {
	sessionRepository  *repository.SessionRepository
	propertyRepository *repository.PropertyRepository
	loginLogRepository *repository.LoginLogRepository
	jobLogRepository   *repository.JobLogRepository
}

func NewTicker(sessionRepository *repository.SessionRepository, propertyRepository *repository.PropertyRepository, loginLogRepository *repository.LoginLogRepository, jobLogRepository *repository.JobLogRepository) *Ticker {
	return &Ticker{sessionRepository: sessionRepository, propertyRepository: propertyRepository, loginLogRepository: loginLogRepository, jobLogRepository: jobLogRepository}
}

func (t *Ticker) SetupTicker() {

	// 每隔一小时删除一次未使用的会话信息
	unUsedSessionTicker := time.NewTicker(time.Minute * 60)
	go func() {
		for range unUsedSessionTicker.C {
			sessions, _ := t.sessionRepository.FindByStatusIn([]string{constant.NoConnect, constant.Connecting})
			if len(sessions) > 0 {
				now := time.Now()
				for i := range sessions {
					if now.Sub(sessions[i].ConnectedTime.Time) > time.Hour*1 {
						_ = t.sessionRepository.DeleteById(sessions[i].ID)
						s := sessions[i].Username + "@" + sessions[i].IP + ":" + strconv.Itoa(sessions[i].Port)
						log.Infof("会话「%v」ID「%v」超过1小时未打开，已删除。", s, sessions[i].ID)
					}
				}
			}
		}
	}()

	// 每隔6小时删除超过时长限制的会话
	timeoutSessionTicker := time.NewTicker(time.Hour * 6)
	go func() {
		for range timeoutSessionTicker.C {
			deleteOutTimeSession(t)
			deleteOutTimeLoginLog(t)
			deleteOutTimeJobLog(t)
		}
	}()
}

func deleteOutTimeSession(t *Ticker) {
	property, err := t.propertyRepository.FindByName("session-saved-limit")
	if err != nil {
		return
	}
	if property.Value == "" || property.Value == "-" {
		return
	}
	limit, err := strconv.Atoi(property.Value)
	if err != nil {
		return
	}
	sessions, err := t.sessionRepository.FindOutTimeSessions(limit)
	if err != nil {
		return
	}

	if len(sessions) > 0 {
		var ids []string
		for i := range sessions {
			ids = append(ids, sessions[i].ID)
		}
		err := t.sessionRepository.DeleteByIds(ids)
		if err != nil {
			log.Errorf("删除离线会话失败 %v", err)
		}
	}
}

func deleteOutTimeLoginLog(t *Ticker) {
	property, err := t.propertyRepository.FindByName("login-log-saved-limit")
	if err != nil {
		return
	}
	if property.Value == "" || property.Value == "-" {
		return
	}
	limit, err := strconv.Atoi(property.Value)
	if err != nil {
		log.Errorf("获取删除登录日志保留时常失败 %v", err)
		return
	}

	loginLogs, err := t.loginLogRepository.FindOutTimeLog(limit)
	if err != nil {
		log.Errorf("获取登录日志失败 %v", err)
		return
	}

	if len(loginLogs) > 0 {
		for i := range loginLogs {
			err := t.loginLogRepository.DeleteById(loginLogs[i].ID)
			if err != nil {
				log.Errorf("删除登录日志失败 %v", err)
			}
		}
	}
}

func deleteOutTimeJobLog(t *Ticker) {
	property, err := t.propertyRepository.FindByName("cron-log-saved-limit")
	if err != nil {
		return
	}
	if property.Value == "" || property.Value == "-" {
		return
	}
	limit, err := strconv.Atoi(property.Value)
	if err != nil {
		return
	}

	jobLogs, err := t.jobLogRepository.FindOutTimeLog(limit)
	if err != nil {
		return
	}

	if len(jobLogs) > 0 {
		for i := range jobLogs {
			err := t.jobLogRepository.DeleteById(jobLogs[i].ID)
			if err != nil {
				log.Errorf("删除计划日志失败 %v", err)
			}
		}
	}
}
