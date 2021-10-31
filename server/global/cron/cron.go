package cron

import "github.com/robfig/cron/v3"

var GlobalCron *cron.Cron

type Job cron.Job

func init() {
	GlobalCron = cron.New(cron.WithSeconds())
	GlobalCron.Start()
}

func JobId(jobId int) cron.EntryID {
	return cron.EntryID(jobId)
}
