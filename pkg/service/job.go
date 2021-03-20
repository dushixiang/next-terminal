package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"next-terminal/pkg/constant"
	"next-terminal/pkg/global"
	"next-terminal/pkg/log"
	"next-terminal/pkg/term"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"

	"github.com/robfig/cron/v3"
)

type JobService struct {
	jobRepository        *repository.JobRepository
	jobLogRepository     *repository.JobLogRepository
	assetRepository      *repository.AssetRepository
	credentialRepository *repository.CredentialRepository
}

func NewJobService(jobRepository *repository.JobRepository, jobLogRepository *repository.JobLogRepository, assetRepository *repository.AssetRepository, credentialRepository *repository.CredentialRepository) *JobService {
	return &JobService{jobRepository: jobRepository, jobLogRepository: jobLogRepository, assetRepository: assetRepository, credentialRepository: credentialRepository}
}

func (r JobService) ChangeStatusById(id, status string) error {
	job, err := r.jobRepository.FindById(id)
	if err != nil {
		return err
	}
	if status == constant.JobStatusRunning {
		j, err := getJob(&job, &r)
		if err != nil {
			return err
		}
		entryID, err := global.Cron.AddJob(job.Cron, j)
		if err != nil {
			return err
		}
		log.Debugf("开启计划任务「%v」,运行中计划任务数量「%v」", job.Name, len(global.Cron.Entries()))

		jobForUpdate := model.Job{ID: id, Status: constant.JobStatusRunning, CronJobId: int(entryID)}

		return r.jobRepository.UpdateById(&jobForUpdate)
	} else {
		global.Cron.Remove(cron.EntryID(job.CronJobId))
		log.Debugf("关闭计划任务「%v」,运行中计划任务数量「%v」", job.Name, len(global.Cron.Entries()))
		jobForUpdate := model.Job{ID: id, Status: constant.JobStatusNotRunning}
		return r.jobRepository.UpdateById(&jobForUpdate)
	}
}

func getJob(j *model.Job, jobService *JobService) (job cron.Job, err error) {
	switch j.Func {
	case constant.FuncCheckAssetStatusJob:
		job = CheckAssetStatusJob{ID: j.ID, Mode: j.Mode, ResourceIds: j.ResourceIds, Metadata: j.Metadata, jobService: jobService}
	case constant.FuncShellJob:
		job = ShellJob{ID: j.ID, Mode: j.Mode, ResourceIds: j.ResourceIds, Metadata: j.Metadata, jobService: jobService}
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
	jobService  *JobService
}

func (r CheckAssetStatusJob) Run() {
	if r.ID == "" {
		return
	}

	var assets []model.Asset
	if r.Mode == constant.JobModeAll {
		assets, _ = r.jobService.assetRepository.FindAll()
	} else {
		assets, _ = r.jobService.assetRepository.FindByIds(strings.Split(r.ResourceIds, ","))
	}

	if len(assets) == 0 {
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

			_ = r.jobService.assetRepository.UpdateActiveById(active, asset.ID)
			log.Infof(msg)
			msgChan <- msg
		}()
	}

	var message = ""
	for i := 0; i < len(assets); i++ {
		message += <-msgChan + "\n"
	}

	_ = r.jobService.jobRepository.UpdateLastUpdatedById(r.ID)
	jobLog := model.JobLog{
		ID:        utils.UUID(),
		JobId:     r.ID,
		Timestamp: utils.NowJsonTime(),
		Message:   message,
	}

	_ = r.jobService.jobLogRepository.Create(&jobLog)
}

type ShellJob struct {
	ID          string
	Mode        string
	ResourceIds string
	Metadata    string
	jobService  *JobService
}

type MetadataShell struct {
	Shell string
}

func (r ShellJob) Run() {
	if r.ID == "" {
		return
	}

	var assets []model.Asset
	if r.Mode == constant.JobModeAll {
		assets, _ = r.jobService.assetRepository.FindByProtocol("ssh")
	} else {
		assets, _ = r.jobService.assetRepository.FindByProtocolAndIds("ssh", strings.Split(r.ResourceIds, ","))
	}

	if len(assets) == 0 {
		return
	}

	var metadataShell MetadataShell
	err := json.Unmarshal([]byte(r.Metadata), &metadataShell)
	if err != nil {
		log.Errorf("JSON数据解析失败 %v", err)
		return
	}

	msgChan := make(chan string)
	for i := range assets {
		asset, err := r.jobService.assetRepository.FindById(assets[i].ID)
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
			credential, err := r.jobService.credentialRepository.FindById(asset.CredentialId)
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
				log.Infof(msg)
			} else {
				msg = fmt.Sprintf("资产「%v」Shell执行成功，返回值「%v」，耗时「%v」", asset.Name, result, elapsed)
				log.Infof(msg)
			}

			msgChan <- msg
		}()
	}

	var message = ""
	for i := 0; i < len(assets); i++ {
		message += <-msgChan + "\n"
	}

	_ = r.jobService.jobRepository.UpdateLastUpdatedById(r.ID)
	jobLog := model.JobLog{
		ID:        utils.UUID(),
		JobId:     r.ID,
		Timestamp: utils.NowJsonTime(),
		Message:   message,
	}

	_ = r.jobService.jobLogRepository.Create(&jobLog)
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

func (r JobService) ExecJobById(id string) (err error) {
	job, err := r.jobRepository.FindById(id)
	if err != nil {
		return err
	}
	j, err := getJob(&job, &r)
	if err != nil {
		return err
	}
	j.Run()
	return nil
}

func (r JobService) InitJob() error {
	jobs, _ := r.jobRepository.FindByFunc(constant.FuncCheckAssetStatusJob)
	if jobs == nil {
		job := model.Job{
			ID:      utils.UUID(),
			Name:    "资产状态检测",
			Func:    constant.FuncCheckAssetStatusJob,
			Cron:    "0 0 0/1 * * ?",
			Mode:    constant.JobModeAll,
			Status:  constant.JobStatusRunning,
			Created: utils.NowJsonTime(),
			Updated: utils.NowJsonTime(),
		}
		if err := r.jobRepository.Create(&job); err != nil {
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

func (r JobService) Create(o *model.Job) (err error) {

	if o.Status == constant.JobStatusRunning {
		j, err := getJob(o, &r)
		if err != nil {
			return err
		}
		jobId, err := global.Cron.AddJob(o.Cron, j)
		if err != nil {
			return err
		}
		o.CronJobId = int(jobId)
	}

	return r.jobRepository.Create(o)
}

func (r JobService) DeleteJobById(id string) error {
	job, err := r.jobRepository.FindById(id)
	if err != nil {
		return err
	}
	if job.Status == constant.JobStatusRunning {
		if err := r.ChangeStatusById(id, constant.JobStatusNotRunning); err != nil {
			return err
		}
	}
	return r.jobRepository.DeleteJobById(id)
}
