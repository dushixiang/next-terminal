package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"next-terminal/server/constant"
	"next-terminal/server/log"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/term"
	"next-terminal/server/utils"

	"gorm.io/gorm"
)

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

	var assets []model.Asset
	if r.Mode == constant.JobModeAll {
		assets, _ = repository.AssetRepository.FindByProtocol(context.TODO(), "ssh")
	} else {
		assets, _ = repository.AssetRepository.FindByProtocolAndIds(context.TODO(), "ssh", strings.Split(r.ResourceIds, ","))
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
		asset, err := AssetService.FindByIdAndDecrypt(context.TODO(), assets[i].ID)
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
			credential, err := CredentialService.FindByIdAndDecrypt(context.TODO(), asset.CredentialId)
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
			result, err := exec(metadataShell.Shell, asset.AccessGatewayId, ip, port, username, password, privateKey, passphrase)
			elapsed := time.Since(t1)
			var msg string
			if err != nil {
				if errors.Is(gorm.ErrRecordNotFound, err) {
					msg = fmt.Sprintf("资产「%v」Shell执行失败，请检查资产所关联接入网关是否存在，耗时「%v」", asset.Name, elapsed)
				} else {
					msg = fmt.Sprintf("资产「%v」Shell执行失败，错误内容为：「%v」，耗时「%v」", asset.Name, err.Error(), elapsed)
				}
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

	_ = repository.JobRepository.UpdateLastUpdatedById(context.TODO(), r.ID)
	jobLog := model.JobLog{
		ID:        utils.UUID(),
		JobId:     r.ID,
		Timestamp: utils.NowJsonTime(),
		Message:   message,
	}

	_ = repository.JobLogRepository.Create(context.TODO(), &jobLog)
}

func exec(shell, accessGatewayId, ip string, port int, username, password, privateKey, passphrase string) (string, error) {
	if accessGatewayId != "" && accessGatewayId != "-" {
		g, err := GatewayService.GetGatewayAndReconnectById(accessGatewayId)
		if err != nil {
			return "", err
		}
		uuid := utils.UUID()
		exposedIP, exposedPort, err := g.OpenSshTunnel(uuid, ip, port)
		if err != nil {
			return "", err
		}
		defer g.CloseSshTunnel(uuid)
		return ExecCommandBySSH(shell, exposedIP, exposedPort, username, password, privateKey, passphrase)
	} else {
		return ExecCommandBySSH(shell, ip, port, username, password, privateKey, passphrase)
	}
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
	defer func() {
		_ = session.Close()
	}()
	//执行远程命令
	combo, err := session.CombinedOutput(cmd)
	if err != nil {
		return "", err
	}
	return string(combo), nil
}
