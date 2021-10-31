package repository

import (
	"time"

	"next-terminal/server/model"

	"gorm.io/gorm"
)

type JobLogRepository struct {
	DB *gorm.DB
}

func NewJobLogRepository(db *gorm.DB) *JobLogRepository {
	jobLogRepository = &JobLogRepository{DB: db}
	return jobLogRepository
}

func (r JobLogRepository) Create(o *model.JobLog) error {
	return r.DB.Create(o).Error
}

func (r JobLogRepository) FindByJobId(jobId string) (o []model.JobLog, err error) {
	err = r.DB.Where("job_id = ?", jobId).Order("timestamp asc").Find(&o).Error
	return
}

func (r JobLogRepository) FindOutTimeLog(dayLimit int) (o []model.JobLog, err error) {
	limitTime := time.Now().Add(time.Duration(-dayLimit*24) * time.Hour)
	err = r.DB.Where("timestamp < ?", limitTime).Find(&o).Error
	return
}

func (r JobLogRepository) DeleteByJobId(jobId string) error {
	return r.DB.Where("job_id = ?", jobId).Delete(model.JobLog{}).Error
}

func (r JobLogRepository) DeleteByIdIn(ids []string) error {
	return r.DB.Where("id in ?", ids).Delete(&model.JobLog{}).Error
}

func (r JobLogRepository) DeleteById(id string) error {
	return r.DB.Where("id = ?", id).Delete(&model.JobLog{}).Error
}
