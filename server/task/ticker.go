package task

import (
	"context"
	"strconv"
	"time"

	"next-terminal/server/constant"
	"next-terminal/server/log"
	"next-terminal/server/repository"
)

type Ticker struct {
}

func NewTicker() *Ticker {
	return &Ticker{}
}
func init() {
	ticker := NewTicker()
	ticker.SetupTicker()
}

func (t *Ticker) SetupTicker() {

	// 每隔一小时删除一次未使用的会话信息
	unUsedSessionTicker := time.NewTicker(time.Minute * 60)
	go func() {
		for range unUsedSessionTicker.C {
			t.deleteUnUsedSession()
		}
	}()

	// 每隔6小时删除超过时长限制的会话
	timeoutSessionTicker := time.NewTicker(time.Hour * 6)
	go func() {
		for range timeoutSessionTicker.C {
			deleteOutTimeSession()
			deleteOutTimeLoginLog()
			deleteOutTimeJobLog()
		}
	}()
}

func (t *Ticker) deleteUnUsedSession() {
	sessions, err := repository.SessionRepository.FindByStatusIn(context.TODO(), []string{constant.NoConnect, constant.Connecting})
	if err != nil {
		log.Errorf("查询会话列表失败: %v", err.Error())
		return
	}
	if len(sessions) > 0 {
		now := time.Now()
		for i := range sessions {
			if now.Sub(sessions[i].ConnectedTime.Time) > time.Hour*1 {
				err := repository.SessionRepository.DeleteById(context.TODO(), sessions[i].ID)
				s := sessions[i].Username + "@" + sessions[i].IP + ":" + strconv.Itoa(sessions[i].Port)
				if err != nil {
					log.Errorf("会话「%v」ID「%v」超过1小时未打开，删除失败: %v", s, sessions[i].ID, err.Error())
				} else {
					log.Infof("会话「%v」ID「%v」超过1小时未打开，已删除。", s, sessions[i].ID)
				}
			}
		}
	}
}

func deleteOutTimeSession() {
	property, err := repository.PropertyRepository.FindByName(context.TODO(), "session-saved-limit")
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
	sessions, err := repository.SessionRepository.FindOutTimeSessions(context.TODO(), limit)
	if err != nil {
		return
	}

	if len(sessions) > 0 {
		var ids []string
		for i := range sessions {
			ids = append(ids, sessions[i].ID)
		}
		err := repository.SessionRepository.DeleteByIds(context.TODO(), ids)
		if err != nil {
			log.Errorf("删除离线会话失败 %v", err)
		}
	}
}

func deleteOutTimeLoginLog() {
	property, err := repository.PropertyRepository.FindByName(context.TODO(), "login-log-saved-limit")
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

	loginLogs, err := repository.LoginLogRepository.FindOutTimeLog(context.TODO(), limit)
	if err != nil {
		log.Errorf("获取登录日志失败 %v", err)
		return
	}

	if len(loginLogs) > 0 {
		for i := range loginLogs {
			err := repository.LoginLogRepository.DeleteById(context.TODO(), loginLogs[i].ID)
			if err != nil {
				log.Errorf("删除登录日志失败 %v", err)
			}
		}
	}
}

func deleteOutTimeJobLog() {
	property, err := repository.PropertyRepository.FindByName(context.TODO(), "cron-log-saved-limit")
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

	jobLogs, err := repository.JobLogRepository.FindOutTimeLog(context.TODO(), limit)
	if err != nil {
		return
	}

	if len(jobLogs) > 0 {
		for i := range jobLogs {
			err := repository.JobLogRepository.DeleteById(context.TODO(), jobLogs[i].ID)
			if err != nil {
				log.Errorf("删除计划日志失败 %v", err)
			}
		}
	}
}
