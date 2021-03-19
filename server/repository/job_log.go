package repository

import (
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

func (r JobLogRepository) DeleteByJobId(jobId string) error {
	return r.DB.Where("job_id = ?", jobId).Delete(model.JobLog{}).Error
}
