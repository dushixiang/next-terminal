package service

import (
	"context"
	"errors"

	"next-terminal/server/constant"
	"next-terminal/server/global/cron"
	"next-terminal/server/log"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"
)

type jobService struct {
}

func (r jobService) ChangeStatusById(id, status string) error {
	job, err := repository.JobRepository.FindById(context.TODO(), id)
	if err != nil {
		return err
	}
	if status == constant.JobStatusRunning {
		j, err := getJob(&job)
		if err != nil {
			return err
		}
		entryID, err := cron.GlobalCron.AddJob(job.Cron, j)
		if err != nil {
			return err
		}
		log.Debugf("开启计划任务「%v」,运行中计划任务数量「%v」", job.Name, len(cron.GlobalCron.Entries()))

		jobForUpdate := model.Job{ID: id, Status: constant.JobStatusRunning, CronJobId: int(entryID)}

		return repository.JobRepository.UpdateById(context.TODO(), &jobForUpdate)
	} else {
		cron.GlobalCron.Remove(cron.JobId(job.CronJobId))
		log.Debugf("关闭计划任务「%v」,运行中计划任务数量「%v」", job.Name, len(cron.GlobalCron.Entries()))
		jobForUpdate := model.Job{ID: id, Status: constant.JobStatusNotRunning}
		return repository.JobRepository.UpdateById(context.TODO(), &jobForUpdate)
	}
}

func getJob(j *model.Job) (job cron.Job, err error) {
	switch j.Func {
	case constant.FuncCheckAssetStatusJob:
		job = CheckAssetStatusJob{
			ID:          j.ID,
			Mode:        j.Mode,
			ResourceIds: j.ResourceIds,
			Metadata:    j.Metadata,
		}
	case constant.FuncShellJob:
		job = ShellJob{ID: j.ID, Mode: j.Mode, ResourceIds: j.ResourceIds, Metadata: j.Metadata}
	default:
		return nil, errors.New("未识别的任务")
	}
	return job, err
}

func (r jobService) ExecJobById(id string) (err error) {
	job, err := repository.JobRepository.FindById(context.TODO(), id)
	if err != nil {
		return err
	}
	j, err := getJob(&job)
	if err != nil {
		return err
	}
	j.Run()
	return nil
}

func (r jobService) InitJob() error {
	jobs, _ := repository.JobRepository.FindAll(context.TODO())
	if len(jobs) == 0 {
		job := model.Job{
			ID:      utils.UUID(),
			Name:    "资产状态检测",
			Func:    constant.FuncCheckAssetStatusJob,
			Cron:    "0 0/10 * * * ?",
			Mode:    constant.JobModeAll,
			Status:  constant.JobStatusRunning,
			Created: utils.NowJsonTime(),
			Updated: utils.NowJsonTime(),
		}
		if err := repository.JobRepository.Create(context.TODO(), &job); err != nil {
			return err
		}
		log.Debugf("创建计划任务「%v」cron「%v」", job.Name, job.Cron)
	} else {
		for i := range jobs {
			if jobs[i].Status == constant.JobStatusRunning {
				err := r.ChangeStatusById(jobs[i].ID, constant.JobStatusRunning)
				if err != nil {
					return err
				}
				log.Debugf("启动计划任务「%v」cron「%v」", jobs[i].Name, jobs[i].Cron)
			}
		}
	}
	return nil
}

func (r jobService) Create(o *model.Job) (err error) {

	if o.Status == constant.JobStatusRunning {
		j, err := getJob(o)
		if err != nil {
			return err
		}
		jobId, err := cron.GlobalCron.AddJob(o.Cron, j)
		if err != nil {
			return err
		}
		o.CronJobId = int(jobId)
	}

	return repository.JobRepository.Create(context.TODO(), o)
}

func (r jobService) DeleteJobById(id string) error {
	job, err := repository.JobRepository.FindById(context.TODO(), id)
	if err != nil {
		return err
	}
	if job.Status == constant.JobStatusRunning {
		if err := r.ChangeStatusById(id, constant.JobStatusNotRunning); err != nil {
			return err
		}
	}
	return repository.JobRepository.DeleteJobById(context.TODO(), id)
}

func (r jobService) UpdateById(m *model.Job) error {
	if err := repository.JobRepository.UpdateById(context.TODO(), m); err != nil {
		return err
	}

	if err := r.ChangeStatusById(m.ID, constant.JobStatusNotRunning); err != nil {
		return err
	}
	if err := r.ChangeStatusById(m.ID, constant.JobStatusRunning); err != nil {
		return err
	}
	return nil
}
