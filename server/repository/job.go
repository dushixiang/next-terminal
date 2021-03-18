package repository

import (
	"gorm.io/gorm"
	"next-terminal/server/global"
	"next-terminal/server/model"
	"next-terminal/server/utils"
)

type JobRepository struct {
	DB *gorm.DB
}

func NewJobRepository(db *gorm.DB) *JobRepository {
	jobRepository = &JobRepository{DB: db}
	return jobRepository
}

func (r JobRepository) Find(pageIndex, pageSize int, name, status, order, field string) (o []model.Job, total int64, err error) {
	job := model.Job{}
	db := r.DB.Table(job.TableName())
	dbCounter := r.DB.Table(job.TableName())

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
	} else if field == "created" {
		field = "created"
	} else {
		field = "updated"
	}

	err = db.Order(field + " " + order).Find(&o).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Error
	if o == nil {
		o = make([]model.Job, 0)
	}
	return
}

func (r JobRepository) FindByFunc(function string) (o []model.Job, err error) {
	db := r.DB
	err = db.Where("func = ?", function).Find(&o).Error
	return
}

func (r JobRepository) Create(o *model.Job) (err error) {
	//
	//if o.Status == constant.JobStatusRunning {
	//	j, err := getJob(o)
	//	if err != nil {
	//		return err
	//	}
	//	jobId, err := global.Cron.AddJob(o.Cron, j)
	//	if err != nil {
	//		return err
	//	}
	//	o.CronJobId = int(jobId)
	//}

	return r.DB.Create(o).Error
}

func (r JobRepository) UpdateById(o *model.Job) (err error) {
	return r.DB.Updates(o).Error
}

func (r JobRepository) UpdateLastUpdatedById(id string) (err error) {
	err = r.DB.Updates(model.Job{ID: id, Updated: utils.NowJsonTime()}).Error
	return
}

func (r JobRepository) FindById(id string) (o model.Job, err error) {
	err = r.DB.Where("id = ?", id).First(&o).Error
	return
}

func (r JobRepository) DeleteJobById(id string) error {
	//job, err := r.FindById(id)
	//if err != nil {
	//	return err
	//}
	//if job.Status == constant.JobStatusRunning {
	//	if err := r.ChangeStatusById(id, constant.JobStatusNotRunning); err != nil {
	//		return err
	//	}
	//}
	return global.DB.Where("id = ?", id).Delete(model.Job{}).Error
}
