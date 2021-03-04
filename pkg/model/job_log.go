package model

import (
	"next-terminal/pkg/global"
	"next-terminal/pkg/utils"
)

type JobLog struct {
	ID        string         `json:"id"`
	Timestamp utils.JsonTime `json:"timestamp"`
	JobId     string         `json:"jobId"`
	Message   string         `json:"message"`
}

func (r *JobLog) TableName() string {
	return "job_logs"
}

func CreateNewJobLog(o *JobLog) error {
	return global.DB.Create(o).Error
}

func FindJobLogs(jobId string) (o []JobLog, err error) {
	err = global.DB.Where("job_id = ?", jobId).Order("timestamp asc").Find(&o).Error
	return
}

func DeleteJobLogByJobId(jobId string) error {
	return global.DB.Where("job_id = ?", jobId).Delete(JobLog{}).Error
}
