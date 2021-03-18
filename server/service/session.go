package service

import (
	"next-terminal/server/constant"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"
)

type SessionService struct {
	sessionRepository *repository.SessionRepository
}

func NewSessionService(sessionRepository *repository.SessionRepository) *SessionService {
	return &SessionService{sessionRepository: sessionRepository}
}

func (r SessionService) Fix() {
	sessions, _ := r.sessionRepository.FindByStatus(constant.Connected)
	if sessions == nil {
		return
	}

	for i := range sessions {
		session := model.Session{
			Status:           constant.Disconnected,
			DisconnectedTime: utils.NowJsonTime(),
		}

		_ = r.sessionRepository.UpdateById(&session, sessions[i].ID)
	}
}
