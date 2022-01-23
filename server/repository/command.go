package repository

import (
	"context"

	"next-terminal/server/constant"
	"next-terminal/server/model"
)

type commandRepository struct {
	baseRepository
}

func (r commandRepository) Find(c context.Context, pageIndex, pageSize int, name, content, order, field string, account *model.User) (o []model.CommandForPage, total int64, err error) {
	db := r.GetDB(c).Table("commands").Select("commands.id,commands.name,commands.content,commands.owner,commands.created, users.nickname as owner_name,COUNT(resource_sharers.user_id) as sharer_count").Joins("left join users on commands.owner = users.id").Joins("left join resource_sharers on commands.id = resource_sharers.resource_id").Group("commands.id")
	dbCounter := r.GetDB(c).Table("commands").Select("DISTINCT commands.id").Joins("left join resource_sharers on commands.id = resource_sharers.resource_id").Group("commands.id")

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

func (r commandRepository) Create(c context.Context, o *model.Command) (err error) {
	if err = r.GetDB(c).Create(o).Error; err != nil {
		return err
	}
	return nil
}

func (r commandRepository) FindById(c context.Context, id string) (o model.Command, err error) {
	err = r.GetDB(c).Where("id = ?", id).First(&o).Error
	return
}

func (r commandRepository) UpdateById(c context.Context, o *model.Command, id string) error {
	o.ID = id
	return r.GetDB(c).Updates(o).Error
}

func (r commandRepository) DeleteById(c context.Context, id string) error {
	return r.GetDB(c).Where("id = ?", id).Delete(&model.Command{}).Error
}

func (r commandRepository) FindByUser(c context.Context, account *model.User) (o []model.CommandForPage, err error) {
	db := r.GetDB(c).Table("commands").Select("commands.id,commands.name,commands.content,commands.owner,commands.created, users.nickname as owner_name,COUNT(resource_sharers.user_id) as sharer_count").Joins("left join users on commands.owner = users.id").Joins("left join resource_sharers on commands.id = resource_sharers.resource_id").Group("commands.id")

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

func (r commandRepository) FindAll(c context.Context) (o []model.Command, err error) {
	err = r.GetDB(c).Find(&o).Error
	return
}
