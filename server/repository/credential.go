package repository

import (
	"encoding/base64"

	"next-terminal/pkg/constant"
	"next-terminal/pkg/global"
	"next-terminal/server/model"
	"next-terminal/server/utils"

	"gorm.io/gorm"
)

type CredentialRepository struct {
	DB *gorm.DB
}

func NewCredentialRepository(db *gorm.DB) *CredentialRepository {
	credentialRepository = &CredentialRepository{DB: db}
	return credentialRepository
}

func (r CredentialRepository) FindByUser(account model.User) (o []model.CredentialSimpleVo, err error) {
	db := r.DB.Table("credentials").Select("DISTINCT credentials.id,credentials.name").Joins("left join resource_sharers on credentials.id = resource_sharers.resource_id")
	if account.Type == constant.TypeUser {
		db = db.Where("credentials.owner = ? or resource_sharers.user_id = ?", account.ID, account.ID)
	}
	err = db.Find(&o).Error
	return
}

func (r CredentialRepository) Find(pageIndex, pageSize int, name, order, field string, account model.User) (o []model.CredentialForPage, total int64, err error) {
	db := r.DB.Table("credentials").Select("credentials.id,credentials.name,credentials.type,credentials.username,credentials.owner,credentials.created,users.nickname as owner_name,COUNT(resource_sharers.user_id) as sharer_count").Joins("left join users on credentials.owner = users.id").Joins("left join resource_sharers on credentials.id = resource_sharers.resource_id").Group("credentials.id")
	dbCounter := r.DB.Table("credentials").Select("DISTINCT credentials.id").Joins("left join resource_sharers on credentials.id = resource_sharers.resource_id").Group("credentials.id")

	if constant.TypeUser == account.Type {
		owner := account.ID
		db = db.Where("credentials.owner = ? or resource_sharers.user_id = ?", owner, owner)
		dbCounter = dbCounter.Where("credentials.owner = ? or resource_sharers.user_id = ?", owner, owner)
	}

	if len(name) > 0 {
		db = db.Where("credentials.name like ?", "%"+name+"%")
		dbCounter = dbCounter.Where("credentials.name like ?", "%"+name+"%")
	}

	err = dbCounter.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	if order == "ascend" {
		order = "asc"
	} else {
		order = "desc"
	}

	if field == "name" {
		field = "name"
	} else {
		field = "created"
	}

	err = db.Order("credentials." + field + " " + order).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Find(&o).Error
	if o == nil {
		o = make([]model.CredentialForPage, 0)
	}
	return
}

func (r CredentialRepository) Create(o *model.Credential) (err error) {
	if err := r.Encrypt(o, global.Config.EncryptionPassword); err != nil {
		return err
	}
	if err = r.DB.Create(o).Error; err != nil {
		return err
	}
	return nil
}

func (r CredentialRepository) FindById(id string) (o model.Credential, err error) {
	err = r.DB.Where("id = ?", id).First(&o).Error
	return
}

func (r CredentialRepository) Encrypt(item *model.Credential, password []byte) error {
	if item.Password != "-" {
		encryptedCBC, err := utils.AesEncryptCBC([]byte(item.Password), password)
		if err != nil {
			return err
		}
		item.Password = base64.StdEncoding.EncodeToString(encryptedCBC)
	}
	if item.PrivateKey != "-" {
		encryptedCBC, err := utils.AesEncryptCBC([]byte(item.PrivateKey), password)
		if err != nil {
			return err
		}
		item.PrivateKey = base64.StdEncoding.EncodeToString(encryptedCBC)
	}
	if item.Passphrase != "-" {
		encryptedCBC, err := utils.AesEncryptCBC([]byte(item.Passphrase), password)
		if err != nil {
			return err
		}
		item.Passphrase = base64.StdEncoding.EncodeToString(encryptedCBC)
	}
	item.Encrypted = true
	return nil
}

func (r CredentialRepository) Decrypt(item *model.Credential, password []byte) error {
	if item.Encrypted {
		if item.Password != "" && item.Password != "-" {
			origData, err := base64.StdEncoding.DecodeString(item.Password)
			if err != nil {
				return err
			}
			decryptedCBC, err := utils.AesDecryptCBC(origData, password)
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
			decryptedCBC, err := utils.AesDecryptCBC(origData, password)
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
			decryptedCBC, err := utils.AesDecryptCBC(origData, password)
			if err != nil {
				return err
			}
			item.Passphrase = string(decryptedCBC)
		}
	}
	return nil
}

func (r CredentialRepository) FindByIdAndDecrypt(id string) (o model.Credential, err error) {
	err = r.DB.Where("id = ?", id).First(&o).Error
	if err == nil {
		err = r.Decrypt(&o, global.Config.EncryptionPassword)
	}
	return
}

func (r CredentialRepository) UpdateById(o *model.Credential, id string) error {
	o.ID = id
	return r.DB.Updates(o).Error
}

func (r CredentialRepository) DeleteById(id string) error {
	return r.DB.Where("id = ?", id).Delete(&model.Credential{}).Error
}

func (r CredentialRepository) Count() (total int64, err error) {
	err = r.DB.Find(&model.Credential{}).Count(&total).Error
	return
}

func (r CredentialRepository) CountByUserId(userId string) (total int64, err error) {
	db := r.DB.Joins("left join resource_sharers on credentials.id = resource_sharers.resource_id")

	db = db.Where("credentials.owner = ? or resource_sharers.user_id = ?", userId, userId)

	// 查询用户所在用户组列表
	userGroupIds, err := userGroupRepository.FindUserGroupIdsByUserId(userId)
	if err != nil {
		return 0, err
	}

	if len(userGroupIds) > 0 {
		db = db.Or("resource_sharers.user_group_id in ?", userGroupIds)
	}
	err = db.Find(&model.Credential{}).Count(&total).Error
	return
}

func (r CredentialRepository) FindAll() (o []model.Credential, err error) {
	err = r.DB.Find(&o).Error
	return
}

func (r CredentialRepository) EncryptedById(encrypted bool, password, privateKey, passphrase, id string) error {
	sql := "update assets set encrypted = ?, password = ?,private_key = ?, passphrase = ?  where id = ?"
	return r.DB.Exec(sql, encrypted, password, privateKey, passphrase, id).Error
}
