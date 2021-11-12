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

func (r SessionService) FixSessionState() error {
	sessions, err := r.sessionRepository.FindByStatus(constant.Connected)
	if err != nil {
		return err
	}

	if len(sessions) > 0 {
		for i := range sessions {
			session := model.Session{
				Status:           constant.Disconnected,
				DisconnectedTime: utils.NowJsonTime(),
			}

			_ = r.sessionRepository.UpdateById(&session, sessions[i].ID)
		}
	}
	return nil
}

func (r SessionService) EmptyPassword() error {
	return r.sessionRepository.EmptyPassword()
}

func (r SessionService) ClearOfflineSession() error {
	sessions, err := r.sessionRepository.FindByStatus(constant.Disconnected)
	if err != nil {
		return err
	}
	sessionIds := make([]string, 0)
	for i := range sessions {
		sessionIds = append(sessionIds, sessions[i].ID)
	}
	return r.sessionRepository.DeleteByIds(sessionIds)
}

func (r SessionService) ReviewedAll() error {
	sessions, err := r.sessionRepository.FindAllUnReviewed()
	if err != nil {
		return err
	}
	var sessionIds = make([]string, 0)
	total := len(sessions)
	for i := range sessions {
		sessionIds = append(sessionIds, sessions[i].ID)
		if i >= 100 && i%100 == 0 {
			if err := r.sessionRepository.UpdateReadByIds(true, sessionIds); err != nil {
				return err
			}
			sessionIds = nil
		} else {
			if i == total-1 {
				if err := r.sessionRepository.UpdateReadByIds(true, sessionIds); err != nil {
					return err
				}
			}
		}

	}
	return nil
}
