package repository

import (
	"next-terminal/pkg/constant"
	"next-terminal/server/model"

	"gorm.io/gorm"
)

type UserRepository struct {
	DB *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	userRepository = &UserRepository{DB: db}
	return userRepository
}

func (r UserRepository) FindAll() (o []model.User) {
	if r.DB.Find(&o).Error != nil {
		return nil
	}
	return
}

func (r UserRepository) Find(pageIndex, pageSize int, username, nickname, mail, order, field string, account model.User) (o []model.UserForPage, total int64, err error) {
	db := r.DB.Table("users").Select("users.id,users.username,users.nickname,users.mail,users.online,users.enabled,users.created,users.type, count(resource_sharers.user_id) as sharer_asset_count, users.totp_secret").Joins("left join resource_sharers on users.id = resource_sharers.user_id and resource_sharers.resource_type = 'asset'").Group("users.id")
	dbCounter := r.DB.Table("users")

	if constant.TypeUser == account.Type {
		// 普通用户只能查看到普通用户
		db = db.Where("users.type = ?", constant.TypeUser)
		dbCounter = dbCounter.Where("type = ?", constant.TypeUser)
	}

	if len(username) > 0 {
		db = db.Where("users.username like ?", "%"+username+"%")
		dbCounter = dbCounter.Where("username like ?", "%"+username+"%")
	}

	if len(nickname) > 0 {
		db = db.Where("users.nickname like ?", "%"+nickname+"%")
		dbCounter = dbCounter.Where("nickname like ?", "%"+nickname+"%")
	}

	if len(mail) > 0 {
		db = db.Where("users.mail like ?", "%"+mail+"%")
		dbCounter = dbCounter.Where("mail like ?", "%"+mail+"%")
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

	if field == "username" {
		field = "username"
	} else if field == "nickname" {
		field = "nickname"
	} else {
		field = "created"
	}

	err = db.Order("users." + field + " " + order).Find(&o).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Error
	if o == nil {
		o = make([]model.UserForPage, 0)
	}

	for i := 0; i < len(o); i++ {
		if o[i].TOTPSecret == "" || o[i].TOTPSecret == "-" {
			o[i].TOTPSecret = "0"
		} else {
			o[i].TOTPSecret = "1"
		}
	}
	return
}

func (r UserRepository) FindById(id string) (o model.User, err error) {
	err = r.DB.Where("id = ?", id).First(&o).Error
	return
}

func (r UserRepository) FindByUsername(username string) (o model.User, err error) {
	err = r.DB.Where("username = ?", username).First(&o).Error
	return
}

func (r UserRepository) FindOnlineUsers() (o []model.User, err error) {
	err = r.DB.Where("online = ?", true).Find(&o).Error
	return
}

func (r UserRepository) Create(o *model.User) error {
	return r.DB.Create(o).Error
}

func (r UserRepository) Update(o *model.User) error {
	return r.DB.Updates(o).Error
}

func (r UserRepository) UpdateOnline(id string, online bool) error {
	sql := "update users set online = ? where id = ?"
	return r.DB.Exec(sql, online, id).Error
}

func (r UserRepository) DeleteById(id string) error {
	return r.DB.Transaction(func(tx *gorm.DB) (err error) {
		// 删除用户
		err = tx.Where("id = ?", id).Delete(&model.User{}).Error
		if err != nil {
			return err
		}
		// 删除用户组中的用户关系
		err = tx.Where("user_id = ?", id).Delete(&model.UserGroupMember{}).Error
		if err != nil {
			return err
		}
		// 删除用户分享到的资产
		err = tx.Where("user_id = ?", id).Delete(&model.ResourceSharer{}).Error
		if err != nil {
			return err
		}
		return nil
	})
}

func (r UserRepository) CountOnlineUser() (total int64, err error) {
	err = r.DB.Where("online = ?", true).Find(&model.User{}).Count(&total).Error
	return
}
