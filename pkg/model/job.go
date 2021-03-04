package model

import (
	"errors"
	"fmt"
	"github.com/robfig/cron/v3"
	"github.com/sirupsen/logrus"
	"next-terminal/pkg/global"
	"next-terminal/pkg/utils"
	"time"
)

const (
	JobStatusRunning    = "running"
	JobStatusNotRunning = "not-running"

	FuncCheckAssetStatusJob = "check-asset-status-job"
)

type Job struct {
	ID        string         `gorm:"primary_key" json:"id"`
	CronJobId int            `json:"cronJobId"`
	Name      string         `json:"name"`
	Func      string         `json:"func"`
	Cron      string         `json:"cron"`
	Status    string         `json:"status"`
	Metadata  string         `json:"metadata"`
	Created   utils.JsonTime `json:"created"`
	Updated   utils.JsonTime `json:"updated"`
}

func (r *Job) TableName() string {
	return "jobs"
}

func FindPageJob(pageIndex, pageSize int, name, status string) (o []Job, total int64, err error) {
	job := Job{}
	db := global.DB.Table(job.TableName())
	dbCounter := global.DB.Table(job.TableName())

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

	err = db.Order("created desc").Find(&o).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Error
	if o == nil {
		o = make([]Job, 0)
	}
	return
}

func FindJobByFunc(function string) (o []Job, err error) {
	db := global.DB
	err = db.Where("func = ?", function).Find(&o).Error
	return
}

func CreateNewJob(o *Job) (err error) {

	if o.Status == JobStatusRunning {
		j, err := getJob(o.ID, o.Func)
		if err != nil {
			return err
		}
		jobId, err := global.Cron.AddJob(o.Cron, j)
		if err != nil {
			return err
		}
		o.CronJobId = int(jobId)
	}

	return global.DB.Create(o).Error
}

func UpdateJobById(o *Job, id string) (err error) {
	if o.Status == JobStatusRunning {
		return errors.New("请先停止定时任务后再修改")
	}

	return global.DB.Where("id = ?", id).Updates(o).Error
}

func UpdateJonUpdatedById(id string) (err error) {
	err = global.DB.Updates(Job{ID: id, Updated: utils.NowJsonTime()}).Error
	return
}

func ChangeJobStatusById(id, status string) (err error) {
	var job Job
	err = global.DB.Where("id = ?", id).First(&job).Error
	if err != nil {
		return err
	}
	if status == JobStatusRunning {
		j, err := getJob(job.ID, job.Func)
		if err != nil {
			return err
		}
		entryID, err := global.Cron.AddJob(job.Cron, j)
		if err != nil {
			return err
		}
		job.CronJobId = int(entryID)
		return global.DB.Updates(Job{ID: id, Status: JobStatusRunning}).Error
	} else {
		global.Cron.Remove(cron.EntryID(job.CronJobId))
		return global.DB.Updates(Job{ID: id, Status: JobStatusNotRunning}).Error
	}
}

func ExecJobById(id string) (err error) {
	job, err := FindJobById(id)
	if err != nil {
		return err
	}
	j, err := getJob(id, job.Func)
	if err != nil {
		return err
	}
	j.Run()
	return nil
}

func FindJobById(id string) (o Job, err error) {
	err = global.DB.Where("id = ?", id).First(&o).Error
	return
}

func DeleteJobById(id string) error {
	job, err := FindJobById(id)
	if err != nil {
		return err
	}
	if job.Status == JobStatusRunning {
		if err := ChangeJobStatusById(id, JobStatusNotRunning); err != nil {
			return err
		}
	}
	return global.DB.Where("id = ?", id).Delete(Job{}).Error
}

func getJob(id, function string) (job cron.Job, err error) {
	switch function {
	case FuncCheckAssetStatusJob:
		job = CheckAssetStatusJob{ID: id}
	default:
		return nil, errors.New("未识别的任务")
	}
	return job, err
}

type CheckAssetStatusJob struct {
	ID string
}

func (r CheckAssetStatusJob) Run() {
	assets, _ := FindAllAsset()
	if assets != nil && len(assets) > 0 {

		msgChan := make(chan string)
		for i := range assets {
			asset := assets[i]
			go func() {
				t1 := time.Now()
				active := utils.Tcping(asset.IP, asset.Port)
				elapsed := time.Since(t1)
				msg := fmt.Sprintf("资产「%v」存活状态检测完成，存活「%v」，耗时「%v」", asset.Name, active, elapsed)

				UpdateAssetActiveById(active, asset.ID)
				logrus.Infof(msg)
				msgChan <- msg
			}()
		}

		if r.ID != "" {
			var message = ""
			for i := 0; i < len(assets); i++ {
				message += <-msgChan + "\n"
			}

			_ = UpdateJonUpdatedById(r.ID)
			jobLog := JobLog{
				ID:        utils.UUID(),
				JobId:     r.ID,
				Timestamp: utils.NowJsonTime(),
				Message:   message,
			}

			_ = CreateNewJobLog(&jobLog)
		}
	}

}
