package service

import (
	"context"
	"encoding/base64"
	"errors"
	"next-terminal/server/common/nt"
	"os"
	"path"
	"strconv"
	"sync"

	"next-terminal/server/common"
	"next-terminal/server/common/guacamole"
	"next-terminal/server/config"
	"next-terminal/server/env"
	"next-terminal/server/global/session"
	"next-terminal/server/log"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"

	"gorm.io/gorm"
)

var SessionService = new(sessionService)

type sessionService struct {
	baseService
}

func (service sessionService) FixSessionState() error {
	sessions, err := repository.SessionRepository.FindByStatus(context.TODO(), nt.Connected)
	if err != nil {
		return err
	}

	if len(sessions) > 0 {
		for i := range sessions {
			s := model.Session{
				Status:           nt.Disconnected,
				DisconnectedTime: common.NowJsonTime(),
			}

			_ = repository.SessionRepository.UpdateById(context.TODO(), &s, sessions[i].ID)
		}
	}
	return nil
}

func (service sessionService) EmptyPassword() error {
	return repository.SessionRepository.EmptyPassword(context.TODO())
}

func (service sessionService) ClearOfflineSession() error {
	sessions, err := repository.SessionRepository.FindByStatus(context.TODO(), nt.Disconnected)
	if err != nil {
		return err
	}
	sessionIds := make([]string, 0)
	for i := range sessions {
		sessionIds = append(sessionIds, sessions[i].ID)
	}
	return service.DeleteByIds(context.TODO(), sessionIds)
}

func (service sessionService) DeleteByIds(c context.Context, sessionIds []string) error {
	recordingPath := config.GlobalCfg.Guacd.Recording
	for i := range sessionIds {
		if err := os.RemoveAll(path.Join(recordingPath, sessionIds[i])); err != nil {
			return err
		}
		if err := repository.SessionRepository.DeleteById(c, sessionIds[i]); err != nil {
			return err
		}
	}
	return nil
}

func (service sessionService) ReviewedAll() error {
	sessions, err := repository.SessionRepository.FindAllUnReviewed(context.TODO())
	if err != nil {
		return err
	}
	var sessionIds = make([]string, 0)
	total := len(sessions)
	for i := range sessions {
		sessionIds = append(sessionIds, sessions[i].ID)
		if i >= 100 && i%100 == 0 {
			if err := repository.SessionRepository.UpdateReadByIds(context.TODO(), true, sessionIds); err != nil {
				return err
			}
			sessionIds = nil
		} else {
			if i == total-1 {
				if err := repository.SessionRepository.UpdateReadByIds(context.TODO(), true, sessionIds); err != nil {
					return err
				}
			}
		}

	}
	return nil
}

var mutex sync.Mutex

func (service sessionService) CloseSessionById(sessionId string, code int, reason string) {
	mutex.Lock()
	defer mutex.Unlock()
	nextSession := session.GlobalSessionManager.GetById(sessionId)
	if nextSession != nil {
		log.Debug("会话关闭", log.String("会话ID", sessionId), log.String("原因", reason))
		service.WriteCloseMessage(nextSession, nextSession.Mode, code, reason)

		if nextSession.Observer != nil {
			nextSession.Observer.Range(func(key string, ob *session.Session) {
				service.WriteCloseMessage(ob, ob.Mode, code, reason)
				log.Debug("强制踢出会话的观察者", log.String("会话ID", sessionId))
			})
		}
	}
	session.GlobalSessionManager.Del(sessionId)

	service.DisDBSess(sessionId, code, reason)
}

func (service sessionService) WriteCloseMessage(sess *session.Session, mode string, code int, reason string) {
	switch mode {
	case nt.Guacd:
		err := guacamole.NewInstruction("error", "", strconv.Itoa(code))
		_ = sess.WriteString(err.String())
		disconnect := guacamole.NewInstruction("disconnect")
		_ = sess.WriteString(disconnect.String())
	case nt.Native, nt.Terminal:
		msg := `0` + reason
		_ = sess.WriteString(msg)
	}
}

func (service sessionService) DisDBSess(sessionId string, code int, reason string) {
	_ = env.GetDB().Transaction(func(tx *gorm.DB) error {
		c := service.Context(tx)
		s, err := repository.SessionRepository.FindById(c, sessionId)
		if err != nil {
			return err
		}

		if s.Status == nt.Disconnected {
			return nil
		}

		if s.Status == nt.Connecting {
			// 会话还未建立成功，无需保留数据
			if err := repository.SessionRepository.DeleteById(c, sessionId); err != nil {
				return err
			}
			return nil
		}

		ss := model.Session{}
		ss.ID = sessionId
		ss.Status = nt.Disconnected
		ss.DisconnectedTime = common.NowJsonTime()
		ss.Code = code
		ss.Message = reason
		ss.Password = "-"
		ss.PrivateKey = "-"
		ss.Passphrase = "-"

		if err := repository.SessionRepository.UpdateById(c, &ss, sessionId); err != nil {
			return err
		}

		return nil
	})
}

func (service sessionService) FindByIdAndDecrypt(c context.Context, id string) (o model.Session, err error) {
	sess, err := repository.SessionRepository.FindById(c, id)
	if err != nil {
		return o, err
	}
	if err := service.Decrypt(&sess); err != nil {
		return o, err
	}
	return sess, nil
}

func (service sessionService) Decrypt(item *model.Session) error {
	if item.Password != "" && item.Password != "-" {
		origData, err := base64.StdEncoding.DecodeString(item.Password)
		if err != nil {
			return err
		}
		decryptedCBC, err := utils.AesDecryptCBC(origData, config.GlobalCfg.EncryptionPassword)
		if err != nil {
			return err
		}
		item.Password = string(decryptedCBC)
	}
	if item.PrivateKey != "" && item.PrivateKey != "-" {
		origData, err := base64.StdEncoding.DecodeString(item.PrivateKey)
		if err != nil {
			return err
		}
		decryptedCBC, err := utils.AesDecryptCBC(origData, config.GlobalCfg.EncryptionPassword)
		if err != nil {
			return err
		}
		item.PrivateKey = string(decryptedCBC)
	}
	if item.Passphrase != "" && item.Passphrase != "-" {
		origData, err := base64.StdEncoding.DecodeString(item.Passphrase)
		if err != nil {
			return err
		}
		decryptedCBC, err := utils.AesDecryptCBC(origData, config.GlobalCfg.EncryptionPassword)
		if err != nil {
			return err
		}
		item.Passphrase = string(decryptedCBC)
	}
	return nil
}

func (service sessionService) renderBoolToStr(b *bool) string {
	if *(b) == true {
		return "1"
	}
	return "0"
}

func (service sessionService) Create(clientIp, assetId, mode string, user *model.User) (*model.Session, error) {
	asset, err := repository.AssetRepository.FindById(context.TODO(), assetId)
	if err != nil {
		return nil, err
	}

	var (
		upload     = "1"
		download   = "1"
		_delete    = "1"
		rename     = "1"
		edit       = "1"
		fileSystem = "1"
		_copy      = "1"
		paste      = "1"
	)

	if asset.Owner != user.ID && nt.TypeUser == user.Type {
		// 普通用户访问非自己创建的资产需要校验权限
		authorised, err := AuthorisedService.GetAuthorised(user.ID, assetId)
		if err != nil {
			return nil, err
		}

		if authorised == nil || authorised.ID == "" {
			return nil, errors.New("您没有权限访问此资产")
		}
		strategyId := authorised.StrategyId
		if strategyId != "" {
			strategy, err := repository.StrategyRepository.FindById(context.TODO(), strategyId)
			if err != nil {
				if !errors.Is(gorm.ErrRecordNotFound, err) {
					return nil, err
				}
			} else {
				upload = service.renderBoolToStr(strategy.Upload)
				download = service.renderBoolToStr(strategy.Download)
				_delete = service.renderBoolToStr(strategy.Delete)
				rename = service.renderBoolToStr(strategy.Rename)
				edit = service.renderBoolToStr(strategy.Edit)
				_copy = service.renderBoolToStr(strategy.Copy)
				paste = service.renderBoolToStr(strategy.Paste)
			}
		}
	}

	var storageId = ""
	if nt.RDP == asset.Protocol {
		attr, err := repository.AssetRepository.FindAssetAttrMapByAssetId(context.TODO(), assetId)
		if err != nil {
			return nil, err
		}
		if "true" == attr[guacamole.EnableDrive] {
			fileSystem = "1"
			storageId = attr[guacamole.DrivePath]
			if storageId == "" {
				storageId = user.ID
			}
		} else {
			fileSystem = "0"
		}
	}
	if fileSystem != "1" {
		fileSystem = "0"
	}
	if upload != "1" {
		upload = "0"
	}
	if download != "1" {
		download = "0"
	}
	if _delete != "1" {
		_delete = "0"
	}
	if rename != "1" {
		rename = "0"
	}
	if edit != "1" {
		edit = "0"
	}
	if _copy != "1" {
		_copy = "0"
	}
	if paste != "1" {
		paste = "0"
	}

	s := &model.Session{
		ID:              utils.UUID(),
		AssetId:         asset.ID,
		Username:        asset.Username,
		Password:        asset.Password,
		PrivateKey:      asset.PrivateKey,
		Passphrase:      asset.Passphrase,
		Protocol:        asset.Protocol,
		IP:              asset.IP,
		Port:            asset.Port,
		Status:          nt.NoConnect,
		ClientIP:        clientIp,
		Mode:            mode,
		FileSystem:      fileSystem,
		Upload:          upload,
		Download:        download,
		Delete:          _delete,
		Rename:          rename,
		Edit:            edit,
		Copy:            _copy,
		Paste:           paste,
		StorageId:       storageId,
		AccessGatewayId: asset.AccessGatewayId,
		Reviewed:        false,
	}
	if nt.Anonymous != user.Type {
		s.Creator = user.ID
	}

	if asset.AccountType == "credential" {
		credential, err := repository.CredentialRepository.FindById(context.TODO(), asset.CredentialId)
		if err != nil {
			return nil, err
		}

		if credential.Type == nt.Custom {
			s.Username = credential.Username
			s.Password = credential.Password
		} else {
			s.Username = credential.Username
			s.PrivateKey = credential.PrivateKey
			s.Passphrase = credential.Passphrase
		}
	}

	if err := repository.SessionRepository.Create(context.TODO(), s); err != nil {
		return nil, err
	}
	if err := repository.AssetRepository.UpdateLastAccessTime(context.Background(), s.AssetId, common.NowJsonTime()); err != nil {
		return nil, err
	}
	return s, nil
}

func (service sessionService) FixSshMode() error {
	return repository.SessionRepository.UpdateMode(context.TODO())
}
