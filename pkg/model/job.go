package model

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/robfig/cron/v3"
	"github.com/sirupsen/logrus"
	"next-terminal/pkg/constant"
	"next-terminal/pkg/global"
	"next-terminal/pkg/term"
	"next-terminal/pkg/utils"
	"strings"
	"time"
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

func FindPageJob(pageIndex, pageSize int, name, status, order, field string) (o []Job, total int64, err error) {
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

	if order == "ascend" {
		order = "asc"
	} else {
		order = "desc"
	}

	if field == "name" {
		field = "name"
	} else if field == "created" {
		field = "created"
	} else {
		field = "updated"
	}

	err = db.Order(field + " " + order).Find(&o).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Error
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

	if o.Status == constant.JobStatusRunning {
		j, err := getJob(o)
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
	if o.Status == constant.JobStatusRunning {
		return errors.New("请先停止定时任务后再修改")
	}

	o.ID = id
	return global.DB.Updates(o).Error
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
	if status == constant.JobStatusRunning {
		j, err := getJob(&job)
		if err != nil {
			return err
		}
		entryID, err := global.Cron.AddJob(job.Cron, j)
		if err != nil {
			return err
		}
		logrus.Debugf("开启计划任务「%v」,运行中计划任务数量「%v」", job.Name, len(global.Cron.Entries()))

		return global.DB.Updates(Job{ID: id, Status: constant.JobStatusRunning, CronJobId: int(entryID)}).Error
	} else {
		global.Cron.Remove(cron.EntryID(job.CronJobId))
		logrus.Debugf("关闭计划任务「%v」,运行中计划任务数量「%v」", job.Name, len(global.Cron.Entries()))
		return global.DB.Updates(Job{ID: id, Status: constant.JobStatusNotRunning}).Error
	}
}

func ExecJobById(id string) (err error) {
	job, err := FindJobById(id)
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

func FindJobById(id string) (o Job, err error) {
	err = global.DB.Where("id = ?", id).First(&o).Error
	return
}

func DeleteJobById(id string) error {
	job, err := FindJobById(id)
	if err != nil {
		return err
	}
	if job.Status == constant.JobStatusRunning {
		if err := ChangeJobStatusById(id, constant.JobStatusNotRunning); err != nil {
			return err
		}
	}
	return global.DB.Where("id = ?", id).Delete(Job{}).Error
}

func getJob(j *Job) (job cron.Job, err error) {
	switch j.Func {
	case constant.FuncCheckAssetStatusJob:
		job = CheckAssetStatusJob{ID: j.ID, Mode: j.Mode, ResourceIds: j.ResourceIds, Metadata: j.Metadata}
	case constant.FuncShellJob:
		job = ShellJob{ID: j.ID, Mode: j.Mode, ResourceIds: j.ResourceIds, Metadata: j.Metadata}
	default:
		return nil, errors.New("未识别的任务")
	}
	return job, err
}

type CheckAssetStatusJob struct {
	ID          string
	Mode        string
	ResourceIds string
	Metadata    string
}

func (r CheckAssetStatusJob) Run() {
	if r.ID == "" {
		return
	}

	var assets []Asset
	if r.Mode == constant.JobModeAll {
		assets, _ = FindAllAsset()
	} else {
		assets, _ = FindAssetByIds(strings.Split(r.ResourceIds, ","))
	}

	if assets == nil || len(assets) == 0 {
		return
	}

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

type ShellJob struct {
	ID          string
	Mode        string
	ResourceIds string
	Metadata    string
}

type MetadataShell struct {
	Shell string
}

func (r ShellJob) Run() {
	if r.ID == "" {
		return
	}

	var assets []Asset
	if r.Mode == constant.JobModeAll {
		assets, _ = FindAssetByProtocol("ssh")
	} else {
		assets, _ = FindAssetByProtocolAndIds("ssh", strings.Split(r.ResourceIds, ","))
	}

	if assets == nil || len(assets) == 0 {
		return
	}

	var metadataShell MetadataShell
	err := json.Unmarshal([]byte(r.Metadata), &metadataShell)
	if err != nil {
		logrus.Errorf("JSON数据解析失败 %v", err)
		return
	}

	msgChan := make(chan string)
	for i := range assets {
		asset, err := FindAssetById(assets[i].ID)
		if err != nil {
			msgChan <- fmt.Sprintf("资产「%v」Shell执行失败，查询数据异常「%v」", assets[i].Name, err.Error())
			return
		}

		var (
			username   = asset.Username
			password   = asset.Password
			privateKey = asset.PrivateKey
			passphrase = asset.Passphrase
			ip         = asset.IP
			port       = asset.Port
		)

		if asset.AccountType == "credential" {
			credential, err := FindCredentialById(asset.CredentialId)
			if err != nil {
				msgChan <- fmt.Sprintf("资产「%v」Shell执行失败，查询授权凭证数据异常「%v」", assets[i].Name, err.Error())
				return
			}

			if credential.Type == constant.Custom {
				username = credential.Username
				password = credential.Password
			} else {
				username = credential.Username
				privateKey = credential.PrivateKey
				passphrase = credential.Passphrase
			}
		}

		go func() {

			t1 := time.Now()
			result, err := ExecCommandBySSH(metadataShell.Shell, ip, port, username, password, privateKey, passphrase)
			elapsed := time.Since(t1)
			var msg string
			if err != nil {
				msg = fmt.Sprintf("资产「%v」Shell执行失败，返回值「%v」，耗时「%v」", asset.Name, err.Error(), elapsed)
				logrus.Infof(msg)
			} else {
				msg = fmt.Sprintf("资产「%v」Shell执行成功，返回值「%v」，耗时「%v」", asset.Name, result, elapsed)
				logrus.Infof(msg)
			}

			msgChan <- msg
		}()
	}

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

func ExecCommandBySSH(cmd, ip string, port int, username, password, privateKey, passphrase string) (result string, err error) {
	sshClient, err := term.NewSshClient(ip, port, username, password, privateKey, passphrase)
	if err != nil {
		return "", err
	}

	session, err := sshClient.NewSession()
	if err != nil {
		return "", err
	}
	defer session.Close()
	//执行远程命令
	combo, err := session.CombinedOutput(cmd)
	if err != nil {
		return "", err
	}
	return string(combo), nil
}
