package repository

import (
	"next-terminal/server/constant"
	"next-terminal/server/model"

	"gorm.io/gorm"
)

type CommandRepository struct {
	DB *gorm.DB
}

func NewCommandRepository(db *gorm.DB) *CommandRepository {
	commandRepository = &CommandRepository{DB: db}
	return commandRepository
}

func (r CommandRepository) Find(pageIndex, pageSize int, name, content, order, field string, account model.User) (o []model.CommandForPage, total int64, err error) {
	db := r.DB.Table("commands").Select("commands.id,commands.name,commands.content,commands.owner,commands.created, users.nickname as owner_name,COUNT(resource_sharers.user_id) as sharer_count").Joins("left join users on commands.owner = users.id").Joins("left join resource_sharers on commands.id = resource_sharers.resource_id").Group("commands.id")
	dbCounter := r.DB.Table("commands").Select("DISTINCT commands.id").Joins("left join resource_sharers on commands.id = resource_sharers.resource_id").Group("commands.id")

	if constant.TypeUser == account.Type {
		owner := account.ID
		db = db.Where("commands.owner = ? or resource_sharers.user_id = ?", owner, owner)
		dbCounter = dbCounter.Where("commands.owner = ? or resource_sharers.user_id = ?", owner, owner)
	}

	if len(name) > 0 {
		db = db.Where("commands.name like ?", "%"+name+"%")
		dbCounter = dbCounter.Where("commands.name like ?", "%"+name+"%")
	}

	if len(content) > 0 {
		db = db.Where("commands.content like ?", "%"+content+"%")
		dbCounter = dbCounter.Where("commands.content like ?", "%"+content+"%")
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

	err = db.Order("commands." + field + " " + order).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Find(&o).Error
	if o == nil {
		o = make([]model.CommandForPage, 0)
	}
	return
}

func (r CommandRepository) Create(o *model.Command) (err error) {
	if err = r.DB.Create(o).Error; err != nil {
		return err
	}
	return nil
}

func (r CommandRepository) FindById(id string) (o model.Command, err error) {
	err = r.DB.Where("id = ?", id).First(&o).Error
	return
}

func (r CommandRepository) UpdateById(o *model.Command, id string) error {
	o.ID = id
	return r.DB.Updates(o).Error
}

func (r CommandRepository) DeleteById(id string) error {
	return r.DB.Where("id = ?", id).Delete(&model.Command{}).Error
}

func (r CommandRepository) FindByUser(account model.User) (o []model.CommandForPage, err error) {
	db := r.DB.Table("commands").Select("commands.id,commands.name,commands.content,commands.owner,commands.created, users.nickname as owner_name,COUNT(resource_sharers.user_id) as sharer_count").Joins("left join users on commands.owner = users.id").Joins("left join resource_sharers on commands.id = resource_sharers.resource_id").Group("commands.id")

	if constant.TypeUser == account.Type {
		owner := account.ID
		db = db.Where("commands.owner = ? or resource_sharers.user_id = ?", owner, owner)
	}
	err = db.Order("commands.name asc").Find(&o).Error
	if o == nil {
		o = make([]model.CommandForPage, 0)
	}
	return
}

func (r CommandRepository) FindAll() (o []model.Command, err error) {
	err = r.DB.Find(&o).Error
	return
}
