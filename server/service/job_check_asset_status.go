package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"next-terminal/server/constant"
	"next-terminal/server/log"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/utils"
)

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

	var assets []model.Asset
	if r.Mode == constant.JobModeAll {
		assets, _ = repository.AssetRepository.FindAll(context.TODO())
	} else {
		assets, _ = repository.AssetRepository.FindByIds(context.TODO(), strings.Split(r.ResourceIds, ","))
	}

	if len(assets) == 0 {
		return
	}

	msgChan := make(chan string)
	for i := range assets {
		asset := assets[i]
		go func() {
			t1 := time.Now()
			var (
				msg  string
				ip   = asset.IP
				port = asset.Port
			)
			active, err := AssetService.CheckStatus(asset.AccessGatewayId, ip, port)

			elapsed := time.Since(t1)
			if err == nil {
				msg = fmt.Sprintf("资产「%v」存活状态检测完成，存活「%v」，耗时「%v」", asset.Name, active, elapsed)
			} else {
				msg = fmt.Sprintf("资产「%v」存活状态检测完成，存活「%v」，耗时「%v」，原因： %v", asset.Name, active, elapsed, err.Error())
			}

			_ = repository.AssetRepository.UpdateActiveById(context.TODO(), active, asset.ID)
			log.Infof(msg)
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
