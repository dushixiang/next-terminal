package repository

import (
	"context"

	"next-terminal/server/common"
	"next-terminal/server/model"
)

var JobRepository = new(jobRepository)

type jobRepository struct {
	baseRepository
}

func (r jobRepository) Find(c context.Context, pageIndex, pageSize int, name, status, order, field string) (o []model.Job, total int64, err error) {
	job := model.Job{}
	db := r.GetDB(c).Table(job.TableName())
	dbCounter := r.GetDB(c).Table(job.TableName())

	if len(name) > 0 {
		db = db.Where("name like ?", "%"+name+"%")
		dbCounter = dbCounter.Where("name like ?", "%"+name+"%")
	}

	if len(status) > 0 {
		db = db.Where("status = ?", status)
		dbCounter = dbCounter.Where("status = ?", status)
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
	} else if field == "updated" {
		field = "updated"
	} else {
		field = "created"
	}

	err = db.Order(field + " " + order).Find(&o).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Error
	if o == nil {
		o = make([]model.Job, 0)
	}
	return
}

func (r jobRepository) FindByFunc(c context.Context, function string) (o []model.Job, err error) {
	db := r.GetDB(c)
	err = db.Where("func = ?", function).Find(&o).Error
	return
}

func (r jobRepository) FindAll(c context.Context) (o []model.Job, err error) {
	db := r.GetDB(c)
	err = db.Find(&o).Error
	return
}

func (r jobRepository) Create(c context.Context, o *model.Job) (err error) {
	return r.GetDB(c).Create(o).Error
}

func (r jobRepository) UpdateById(c context.Context, o *model.Job) (err error) {
	return r.GetDB(c).Updates(o).Error
}

func (r jobRepository) UpdateLastUpdatedById(c context.Context, id string) (err error) {
	err = r.GetDB(c).Updates(model.Job{ID: id, Updated: common.NowJsonTime()}).Error
	return
}

func (r jobRepository) FindById(c context.Context, id string) (o model.Job, err error) {
	err = r.GetDB(c).Where("id = ?", id).First(&o).Error
	return
}

func (r jobRepository) DeleteJobById(c context.Context, id string) error {
	return r.GetDB(c).Where("id = ?", id).Delete(model.Job{}).Error
}
