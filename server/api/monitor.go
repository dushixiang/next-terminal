package api

import (
	"bytes"
	"encoding/json"
	"io/ioutil"
	"regexp"
	"strconv"
	"strings"
	"time"

	"next-terminal/pkg/log"
	"next-terminal/pkg/term"
	"next-terminal/server/model"
	"next-terminal/server/utils"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	"golang.org/x/crypto/ssh"
)

const (
	DockerCMD = "docker stats --no-stream --format \"table{{.Container}}[,]{{.CPUPerc}}[,]{{.MemUsage}}[,]{{.Name}}\""

	TopCMD = "top -n 1 -b -s"

	NetWorkCMD = "/sbin/ifconfig eth0 |grep bytes; sleep 1s; /sbin/ifconfig eth0 | grep bytes"
)

var statisticsError = errors.New("Get base monitor error")

type MonitorInfo struct {
	BaseInfo BaseInfo     `json:"base_info"`
	Docker   []DockerInfo `json:"docker"`
	NetWork  NewWork      `json:"net_work"`
}

type NewWork struct {
	RxTotal          string `json:"rx_total"`
	TxTotal          string `json:"tx_total"`
	RxSpeedPreSecond int64  `json:"rx_speed_pre_second"`
	TxSpeedPreSecond int64  `json:"tx_speed_pre_second"`
}

type BaseInfo struct {
	// uptime
	Uptime     string `json:"uptime"`
	OnlineUser int    `json:"online_user"`
	// memory
	Total int64 `json:"total"`
	Free  int64 `json:"free"`
	Used  int64 `json:"used"`
	Cache int64 `json:"cache"`
	// cpu
	TotalUse float64 `json:"total_use"`
	SysUse   float64 `json:"sys_use"`
	UserUse  float64 `json:"user_use"`
	IOWait   float64 `json:"io_wait"`
	Steal    float64 `json:"steal"`
}

type DockerInfo struct {
	ContainerID   string `json:"container_id"`
	ContainerName string `json:"container_name"`
	CpuPre        string `json:"cpu_pre"`
	MemUsageLimit string `json:"mem_usage_limit"`
}

func GetNetWorkInfo(client *ssh.Client) (ret NewWork, err error) {
	session, err := client.NewSession()
	if err != nil {
		err = errors.Wrap(err, "NewSession")
		return
	}
	stdOut, _ := session.StdoutPipe()
	err = session.Run(NetWorkCMD)
	if err != nil {
		err = errors.Wrap(err, "exec cmd error")
		return
	}
	res, err := ioutil.ReadAll(stdOut)
	if err != nil {
		err = errors.Wrap(err, "red stdout error")
		return
	}
	resStr := strings.Split(string(res), "\n")
	if len(resStr) != 5 {
		return
	}
	resStr = resStr[:4]
	rxReg := regexp.MustCompile(`RX\s+packets\s+\d+\s+bytes\s+(\d+)\s+\((.*?)\)`)
	txReg := regexp.MustCompile(`TX\s+packets\s+\d+\s+bytes\s+(\d+)\s+\((.*?)\)`)
	var firstTx, firstRx, secondRx, secondTx int64
	var totalRx, totalTx string
	for i, line := range resStr {
		switch i {
		case 0:
			firstRx, _, err = utils.ParseNetReg(line, rxReg, 3, 1)
			if err != nil {
				return
			}
		case 1:
			firstTx, _, err = utils.ParseNetReg(line, txReg, 3, 1)
			if err != nil {
				return
			}
		case 2:
			secondRx, totalRx, err = utils.ParseNetReg(line, rxReg, 3, 1)
			if err != nil {
				return
			}

		case 3:
			secondTx, totalTx, err = utils.ParseNetReg(line, txReg, 3, 1)

			if err != nil {
				return
			}
		}

	}

	ret.TxSpeedPreSecond = secondTx - firstTx
	ret.RxSpeedPreSecond = secondRx - firstRx
	ret.RxTotal = totalRx
	ret.TxTotal = totalTx
	return
}

func GetDockerInfo(client *ssh.Client) (ret []DockerInfo, err error) {
	session, err := client.NewSession()
	if err != nil {
		return nil, err
	}
	stdOut, _ := session.StdoutPipe()
	err = session.Run(DockerCMD)
	if err != nil {
		return nil, err
	}
	res, _ := ioutil.ReadAll(stdOut)
	for _, line := range strings.Split(string(res), "\n")[1:] {
		if line == "" {
			continue
		}
		dockerStr := strings.Split(line, "[,]")
		if len(dockerStr) != 4 {
			log.Error(errors.New(" dockerStr format error"), line)
			continue
		}
		ret = append(ret, DockerInfo{
			ContainerID:   dockerStr[0],
			ContainerName: dockerStr[3],
			CpuPre:        dockerStr[1],
			MemUsageLimit: dockerStr[2],
		})

	}
	defer func() {
		session.Close()
	}()
	return
}

func getBaseInfo(client *ssh.Client) (ret BaseInfo, err error) {
	var session *ssh.Session
	var res []byte
	session, err = client.NewSession()
	defer func() {
		session.Close()
	}()
	if err != nil {
		err = errors.Wrap(err, "New session error")
		return
	}
	var stdErr bytes.Buffer
	session.Stderr = &stdErr
	stdout, _ := session.StdoutPipe()
	err = session.Run(TopCMD)
	if err != nil {
		err = errors.Wrap(err, "Cmd error")
		return
	}
	res, err = ioutil.ReadAll(stdout)
	if err != nil {
		return
	}
	data := strings.Split(string(res), "\n")
	if len(data) < 3 {
		return
	}
	upReg := regexp.MustCompile(`up\s(\d+\s\w+),`)
	userReg := regexp.MustCompile(`\s+(\d+)\suser`)
	memUsReg := regexp.MustCompile(`KiB\s+Mem\s+:\s+(\d+)\stotal,\s+(\d+)\sfree,\s+(\d+)\sused,\s+(\d+)\sbuff`)
	cpuReg := regexp.MustCompile(`Cpu\(s\):\s+(\d+.\d+)\sus,\s+(\d+.\d+)\ssy,.*?,.*?,\s+(\d+.\d+).*?,.*?,.*?,\s+(\d+.\d+)\s+st`)
	for i, line := range data[:4] {
		if i == 0 {
			up := upReg.FindStringSubmatch(line)
			if len(up) != 2 {
				err = statisticsError
				return
			}
			ret.Uptime = up[1]
			userRes := userReg.FindStringSubmatch(line)
			if len(userRes) != 2 {
				err = statisticsError
				return
			}
			userCount, err := strconv.Atoi(userRes[1])
			if err != nil {
				return ret, statisticsError
			}
			ret.OnlineUser = userCount
		}
		if i == 2 {
			cpuRes := cpuReg.FindStringSubmatch(line)
			if len(cpuRes) != 5 {
				log.Info(cpuRes)
				continue
			}
			for i, item := range cpuRes[1:] {
				cInt, err := strconv.ParseFloat(item, 64)
				if err != nil {
					return ret, statisticsError
				}
				switch i {
				case 0:
					ret.UserUse = cInt
				case 1:
					ret.SysUse = cInt
				case 2:
					ret.IOWait = cInt
				case 3:
					ret.Steal = cInt
				}
			}
		}
		if i == 3 {
			memUseArray := memUsReg.FindStringSubmatch(line)
			if len(memUseArray) != 5 {
				continue
			}
			for i, item := range memUseArray[1:] {
				intC, err := strconv.Atoi(item)
				if err != nil {
					continue
				}
				switch i {
				case 0:
					ret.Total = int64(intC)
				case 1:
					ret.Free = int64(intC)
				case 2:
					ret.Used = int64(intC)
				case 3:
					ret.Cache = int64(intC)

				}
			}
		}
	}
	return
}

func MonitorEndpoint(c echo.Context) (err error) {
	assetId := c.Param("id")
	asset, err := assetRepository.FindById(assetId)
	if err != nil {
		return Fail(c, 200, "资产错误")
	}
	if asset.Password == "" && asset.CredentialId == "" {
		return Success(c, "资产未配置登陆凭证")
	}
	if !utils.Tcping(asset.IP, asset.Port) {
		return Fail(c, 200, "资产不在线")
	}
	ws, err := UpGrader.Upgrade(c.Response().Writer, c.Request(), nil)
	if err != nil {
		log.Errorf("升级为WebSocket协议失败：%v", err.Error())
		return err
	}
	defer func() {
		ws.Close()
	}()
	var returnData MonitorInfo
	switch model.AssetProto(asset.Protocol) {
	case model.SSH:
		terminal, err := term.NewSshClient(asset.IP, asset.Port, asset.Username, asset.Password,
			asset.PrivateKey, asset.Passphrase)
		if err != nil {
			log.Error(err)
			_ = WriteMessage(ws, FailMessage())
		}

		for {
			msgt, msg, _ := ws.ReadMessage()
			if err != nil {
				break
			}
			if msgt != websocket.TextMessage {
				break
			}
			if string(msg) != "status" {
				break
			}
			dockerInfo, err := GetDockerInfo(terminal)
			if err != nil {
				log.Error(errors.New("format error"))
				return WriteMessage(ws, NewMessage(Closed, "Get docker status error"))
			}
			returnData.Docker = dockerInfo
			base, err := getBaseInfo(terminal)
			if err != nil {
				log.Error(err, "getBaseInfo error")
				return WriteMessage(ws, NewMessage(Closed, "Get base status error"))
			}
			returnData.BaseInfo = base

			netInfo, err := GetNetWorkInfo(terminal)
			if err != nil {
				log.Error(err, "Get network error")
				return WriteMessage(ws, NewMessage(Closed, "get monitor error"))
			}
			returnData.NetWork = netInfo

			data, err := json.Marshal(returnData)
			if err != nil {
				log.Error(errors.Wrap(err, "Marshal error"))
				return WriteMessage(ws, NewMessage(Closed, "get monitor error"))
			}
			WriteByteMessage(ws, data)
			time.After(1 * time.Second)
		}
	}
	return

}
