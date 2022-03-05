package service

import (
	"context"
	"encoding/base64"
	"errors"
	"strconv"
	"sync"

	"next-terminal/server/config"
	"next-terminal/server/constant"
	"next-terminal/server/env"
	"next-terminal/server/global/session"
	"next-terminal/server/guacd"
	"next-terminal/server/log"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"

	"github.com/gorilla/websocket"
	"gorm.io/gorm"
)

type sessionService struct {
	baseService
}

func (service sessionService) FixSessionState() error {
	sessions, err := repository.SessionRepository.FindByStatus(context.TODO(), constant.Connected)
	if err != nil {
		return err
	}

	if len(sessions) > 0 {
		for i := range sessions {
			s := model.Session{
				Status:           constant.Disconnected,
				DisconnectedTime: utils.NowJsonTime(),
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
	sessions, err := repository.SessionRepository.FindByStatus(context.TODO(), constant.Disconnected)
	if err != nil {
		return err
	}
	sessionIds := make([]string, 0)
	for i := range sessions {
		sessionIds = append(sessionIds, sessions[i].ID)
	}
	return repository.SessionRepository.DeleteByIds(context.TODO(), sessionIds)
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
		log.Debugf("[%v] 会话关闭，原因：%v", sessionId, reason)
		service.WriteCloseMessage(nextSession.WebSocket, nextSession.Mode, code, reason)

		if nextSession.Observer != nil {
			obs := nextSession.Observer.All()
			for _, ob := range obs {
				service.WriteCloseMessage(ob.WebSocket, ob.Mode, code, reason)
				log.Debugf("[%v] 强制踢出会话的观察者: %v", sessionId, ob.ID)
			}
		}
	}
	session.GlobalSessionManager.Del <- sessionId

	service.DisDBSess(sessionId, code, reason)
}

func (service sessionService) WriteCloseMessage(ws *websocket.Conn, mode string, code int, reason string) {
	switch mode {
	case constant.Guacd:
		if ws != nil {
			err := guacd.NewInstruction("error", "", strconv.Itoa(code))
			_ = ws.WriteMessage(websocket.TextMessage, []byte(err.String()))
			disconnect := guacd.NewInstruction("disconnect")
			_ = ws.WriteMessage(websocket.TextMessage, []byte(disconnect.String()))
		}
	case constant.Native:
		if ws != nil {
			msg := `0` + reason
			_ = ws.WriteMessage(websocket.TextMessage, []byte(msg))
		}
	case constant.Terminal:
		// 这里是关闭观察者的ssh会话
		if ws != nil {
			msg := `0` + reason
			_ = ws.WriteMessage(websocket.TextMessage, []byte(msg))
		}
	}
}

func (service sessionService) DisDBSess(sessionId string, code int, reason string) {
	_ = env.GetDB().Transaction(func(tx *gorm.DB) error {
		c := service.Context(tx)
		s, err := repository.SessionRepository.FindById(c, sessionId)
		if err != nil {
			return err
		}

		if s.Status == constant.Disconnected {
			return err
		}

		if s.Status == constant.Connecting {
			// 会话还未建立成功，无需保留数据
			if err := repository.SessionRepository.DeleteById(c, sessionId); err != nil {
				return err
			}
			return nil
		}

		ss := model.Session{}
		ss.ID = sessionId
		ss.Status = constant.Disconnected
		ss.DisconnectedTime = utils.NowJsonTime()
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

	if asset.Owner != user.ID && constant.TypeUser == user.Type {
		// 普通用户访问非自己创建的资产需要校验权限
		resourceSharers, err := repository.ResourceSharerRepository.FindByResourceIdAndUserId(context.TODO(), assetId, user.ID)
		if err != nil {
			return nil, err
		}
		if len(resourceSharers) == 0 {
			return nil, errors.New("您没有权限访问此资产")
		}
		strategyId := resourceSharers[0].StrategyId
		if strategyId != "" {
			strategy, err := repository.StrategyRepository.FindById(context.TODO(), strategyId)
			if err != nil {
				if !errors.Is(gorm.ErrRecordNotFound, err) {
					return nil, err
				}
			} else {
				upload = strategy.Upload
				download = strategy.Download
				_delete = strategy.Delete
				rename = strategy.Rename
				edit = strategy.Edit
				_copy = strategy.Copy
				paste = strategy.Paste
			}
		}
	}

	var storageId = ""
	if constant.RDP == asset.Protocol {
		attr, err := repository.AssetRepository.FindAssetAttrMapByAssetId(context.TODO(), assetId)
		if err != nil {
			return nil, err
		}
		if "true" == attr[guacd.EnableDrive] {
			fileSystem = "1"
			storageId = attr[guacd.DrivePath]
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
		Status:          constant.NoConnect,
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
	if constant.Anonymous != user.Type {
		s.Creator = user.ID
	}

	if asset.AccountType == "credential" {
		credential, err := repository.CredentialRepository.FindById(context.TODO(), asset.CredentialId)
		if err != nil {
			return nil, err
		}

		if credential.Type == constant.Custom {
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
	return s, nil
}

func (service sessionService) FixSshMode() error {
	return repository.SessionRepository.UpdateMode(context.TODO())
}
