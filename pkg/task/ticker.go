package task

import (
	"strconv"
	"time"

	"next-terminal/pkg/constant"
	"next-terminal/pkg/log"
	"next-terminal/server/repository"
)

type Ticker struct {
	sessionRepository  *repository.SessionRepository
	propertyRepository *repository.PropertyRepository
}

func NewTicker(sessionRepository *repository.SessionRepository, propertyRepository *repository.PropertyRepository) *Ticker {
	return &Ticker{sessionRepository: sessionRepository, propertyRepository: propertyRepository}
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

	// 每日凌晨删除超过时长限制的会话
	timeoutSessionTicker := time.NewTicker(time.Hour * 24)
	go func() {
		for range timeoutSessionTicker.C {
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
				var sessionIds []string
				for i := range sessions {
					sessionIds = append(sessionIds, sessions[i].ID)
				}
				err := t.sessionRepository.DeleteByIds(sessionIds)
				if err != nil {
					log.Errorf("删除离线会话失败 %v", err)
				}
			}
		}
	}()
}
