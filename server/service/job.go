package service

import (
	"context"
	"errors"

	"next-terminal/server/common"
	"next-terminal/server/common/nt"
	"next-terminal/server/global/cron"
	"next-terminal/server/log"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"
)

var JobService = new(jobService)

type jobService struct {
}

func (r jobService) ChangeStatusById(id, status string) error {
	job, err := repository.JobRepository.FindById(context.TODO(), id)
	if err != nil {
		return err
	}
	if status == nt.JobStatusRunning {
		j, err := getJob(&job)
		if err != nil {
			return err
		}
		entryID, err := cron.GlobalCron.AddJob(job.Cron, j)
		if err != nil {
			return err
		}
		log.Debug("开启计划任务", log.String("任务名称", job.Name), log.Int("运行中计划任务数量", len(cron.GlobalCron.Entries())))

		jobForUpdate := model.Job{ID: id, Status: nt.JobStatusRunning, CronJobId: int(entryID)}

		return repository.JobRepository.UpdateById(context.TODO(), &jobForUpdate)
	} else {
		cron.GlobalCron.Remove(cron.JobId(job.CronJobId))
		log.Debug("关闭计划任务", log.String("任务名称", job.Name), log.Int("运行中计划任务数量", len(cron.GlobalCron.Entries())))
		jobForUpdate := model.Job{ID: id, Status: nt.JobStatusNotRunning}
		return repository.JobRepository.UpdateById(context.TODO(), &jobForUpdate)
	}
}

func getJob(j *model.Job) (job cron.Job, err error) {
	switch j.Func {
	case nt.FuncCheckAssetStatusJob:
		job = CheckAssetStatusJob{
			ID:          j.ID,
			Mode:        j.Mode,
			ResourceIds: j.ResourceIds,
			Metadata:    j.Metadata,
		}
	case nt.FuncShellJob:
		job = ShellJob{
			ID:          j.ID,
			Mode:        j.Mode,
			ResourceIds: j.ResourceIds,
			Metadata:    j.Metadata,
		}
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
			Func:    nt.FuncCheckAssetStatusJob,
			Cron:    "0 0/10 * * * ?",
			Mode:    nt.JobModeAll,
			Status:  nt.JobStatusRunning,
			Created: common.NowJsonTime(),
			Updated: common.NowJsonTime(),
		}
		if err := repository.JobRepository.Create(context.TODO(), &job); err != nil {
			return err
		}
	} else {
		for i := range jobs {
			if jobs[i].Status == nt.JobStatusRunning {
				err := r.ChangeStatusById(jobs[i].ID, nt.JobStatusRunning)
				if err != nil {
					return err
				}
			}
		}
	}
	return nil
}

func (r jobService) Create(ctx context.Context, o *model.Job) (err error) {

	if o.Status == nt.JobStatusRunning {
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

	return repository.JobRepository.Create(ctx, o)
}

func (r jobService) DeleteJobById(id string) error {
	job, err := repository.JobRepository.FindById(context.TODO(), id)
	if err != nil {
		return err
	}
	if job.Status == nt.JobStatusRunning {
		if err := r.ChangeStatusById(id, nt.JobStatusNotRunning); err != nil {
			return err
		}
	}
	return repository.JobRepository.DeleteJobById(context.TODO(), id)
}

func (r jobService) UpdateById(m *model.Job) error {
	job, err := repository.JobRepository.FindById(context.TODO(), m.ID)
	if err != nil {
		return err
	}
	if err := repository.JobRepository.UpdateById(context.TODO(), m); err != nil {
		return err
	}

	if job.Status == nt.JobStatusRunning {
		if err := r.ChangeStatusById(m.ID, nt.JobStatusNotRunning); err != nil {
			return err
		}
		if err := r.ChangeStatusById(m.ID, nt.JobStatusRunning); err != nil {
			return err
		}
	}

	return nil
}
