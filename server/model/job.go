package model

import (
	"next-terminal/server/utils"
)

type Job struct {
	ID          string         `gorm:"primary_key" json:"id"`
	CronJobId   int            `json:"cronJobId"`
	Name        string         `json:"name"`
	Func        string         `json:"func"`
	Cron        string         `json:"cron"`
	Mode        string         `json:"mode"`
	ResourceIds string         `json:"resourceIds"`
	Status      string         `json:"status"`
	Metadata    string         `json:"metadata"`
	Created     utils.JsonTime `json:"created"`
	Updated     utils.JsonTime `json:"updated"`
}

func (r *Job) TableName() string {
	return "jobs"
}

type JobLog struct {
	ID        string         `json:"id"`
	Timestamp utils.JsonTime `json:"timestamp"`
	JobId     string         `json:"jobId"`
	Message   string         `json:"message"`
}

func (r *JobLog) TableName() string {
	return "job_logs"
}
