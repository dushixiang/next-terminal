package repository

import (
	"context"
	"time"

	"next-terminal/server/model"
)

type jobLogRepository struct {
	baseRepository
}

func (r jobLogRepository) Create(c context.Context, o *model.JobLog) error {
	return r.GetDB(c).Create(o).Error
}

func (r jobLogRepository) FindByJobId(c context.Context, jobId string) (o []model.JobLog, err error) {
	err = r.GetDB(c).Where("job_id = ?", jobId).Order("timestamp asc").Find(&o).Error
	return
}

func (r jobLogRepository) FindOutTimeLog(c context.Context, dayLimit int) (o []model.JobLog, err error) {
	limitTime := time.Now().Add(time.Duration(-dayLimit*24) * time.Hour)
	err = r.GetDB(c).Where("timestamp < ?", limitTime).Find(&o).Error
	return
}

func (r jobLogRepository) DeleteByJobId(c context.Context, jobId string) error {
	return r.GetDB(c).Where("job_id = ?", jobId).Delete(model.JobLog{}).Error
}

func (r jobLogRepository) DeleteByIdIn(c context.Context, ids []string) error {
	return r.GetDB(c).Where("id in ?", ids).Delete(&model.JobLog{}).Error
}

func (r jobLogRepository) DeleteById(c context.Context, id string) error {
	return r.GetDB(c).Where("id = ?", id).Delete(&model.JobLog{}).Error
}
