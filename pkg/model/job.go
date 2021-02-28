package model

import (
	"errors"
	"github.com/robfig/cron/v3"
	"github.com/sirupsen/logrus"
	"next-terminal/pkg/global"
	"next-terminal/pkg/utils"
	"strconv"
	"time"
)

const (
	JobStatusRunning    = "running"
	JobStatusNotRunning = "not-running"

	FuncCheckAssetStatusJob  = "check-asset-status-job"
	FuncDelUnUsedSessionJob  = "del-unused-session-job"
	FuncDelTimeoutSessionJob = "del-timeout-session-job"
)

type Job struct {
	ID      string         `gorm:"primary_key" json:"id"`
	JobId   int            `json:"jobId"`
	Name    string         `json:"name"`
	Func    string         `json:"func"`
	Cron    string         `json:"cron"`
	Status  string         `json:"status"`
	Created utils.JsonTime `json:"created"`
	Updated utils.JsonTime `json:"updated"`
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
		o.JobId = int(jobId)
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
	err = global.DB.Where("id = ?", id).Update("updated = ?", utils.NowJsonTime()).Error
	return
}

func ChangeJobStatusById(id, status string) (err error) {
	var job Job
	err = global.DB.Where("id = ?", id).First(&job).Error
	if err != nil {
		return err
	}
	if status == JobStatusNotRunning {
		j, err := getJob(job.ID, job.Func)
		if err != nil {
			return err
		}
		entryID, err := global.Cron.AddJob(job.Cron, j)
		if err != nil {
			return err
		}
		job.JobId = int(entryID)
		return global.DB.Where("id = ?", id).Update("status = ?", JobStatusRunning).Error
	} else {
		global.Cron.Remove(cron.EntryID(job.JobId))
		return global.DB.Where("id = ?", id).Update("status = ?", JobStatusNotRunning).Error
	}
}

func FindJobById(id string) (o Job, err error) {
	err = global.DB.Where("id = ?").First(&o).Error
	return
}

func DeleteJobById(id string) error {
	job, err := FindJobById(id)
	if err != nil {
		return err
	}
	if job.Status == JobStatusRunning {
		if err := ChangeJobStatusById(JobStatusNotRunning, id); err != nil {
			return err
		}
	}
	return global.DB.Where("id = ?").Delete(Job{}).Error
}

func getJob(id, function string) (job cron.Job, err error) {
	switch function {
	case FuncCheckAssetStatusJob:
		job = CheckAssetStatusJob{ID: id}
	case FuncDelUnUsedSessionJob:
		job = DelUnUsedSessionJob{ID: id}
	case FuncDelTimeoutSessionJob:
		job = DelTimeoutSessionJob{ID: id}
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
		for i := range assets {
			asset := assets[i]
			active := utils.Tcping(asset.IP, asset.Port)
			UpdateAssetActiveById(active, asset.ID)
			logrus.Infof("资产「%v」ID「%v」存活状态检测完成，存活「%v」。", asset.Name, asset.ID, active)
		}
	}
	if r.ID != "" {
		_ = UpdateJonUpdatedById(r.ID)
	}
}

type DelUnUsedSessionJob struct {
	ID string
}

func (r DelUnUsedSessionJob) Run() {
	sessions, _ := FindSessionByStatusIn([]string{NoConnect, Connecting})
	if sessions != nil && len(sessions) > 0 {
		now := time.Now()
		for i := range sessions {
			if now.Sub(sessions[i].ConnectedTime.Time) > time.Hour*1 {
				_ = DeleteSessionById(sessions[i].ID)
				s := sessions[i].Username + "@" + sessions[i].IP + ":" + strconv.Itoa(sessions[i].Port)
				logrus.Infof("会话「%v」ID「%v」超过1小时未打开，已删除。", s, sessions[i].ID)
			}
		}
	}
	if r.ID != "" {
		_ = UpdateJonUpdatedById(r.ID)
	}
}

type DelTimeoutSessionJob struct {
	ID string
}

func (r DelTimeoutSessionJob) Run() {
	property, err := FindPropertyByName("session-saved-limit")
	if err != nil {
		return
	}
	if property.Value == "" || property.Value == "-" {
		return
	}
	limit, err := strconv.Atoi(property.Value)
	if err != nil {
		return
	}
	sessions, err := FindOutTimeSessions(limit)
	if err != nil {
		return
	}

	if sessions != nil && len(sessions) > 0 {
		var sessionIds []string
		for i := range sessions {
			sessionIds = append(sessionIds, sessions[i].ID)
		}
		err := DeleteSessionByIds(sessionIds)
		if err != nil {
			logrus.Errorf("删除离线会话失败 %v", err)
		}
	}
	if r.ID != "" {
		_ = UpdateJonUpdatedById(r.ID)
	}
}
