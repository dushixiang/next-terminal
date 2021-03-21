package api

import (
	"io/ioutil"

	"next-terminal/pkg/log"
	"next-terminal/pkg/term"
	"next-terminal/server/model"
	"next-terminal/server/utils"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
)

const (
	DockerCMD = "docker stats --no-stream --format \"table{{.Container}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.Name}}\""

	TopCMD = `top -n 1 `
)

// TODO 定义响应
type MonitorInfo struct {
	Memory  interface{}  `json:"memory"`
	Docker  []DockerInfo `json:"docker"`
	NetWork interface{}  `json:"net_work"`
}

type DockerInfo struct {
	ContainerID   string `json:"container_id"`
	ContainerName string `json:"container_name"`
	CpuPre        string `json:"cpu_pre"`
	MemUsageLimit string `json:"mem_usage_limit"`
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
	//var returnData MonitorInfo
	switch model.AssetProto(asset.Protocol) {
	case model.SSH:
		nextTerminal, err := term.NewSshClient(asset.IP, asset.Port, asset.Username, asset.Password,
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
			session, err := nextTerminal.NewSession()
			if err != nil {
				return WriteMessage(ws, FailMessage())
			}
			stdOut, _ := session.StdoutPipe()
			//stdIn, _ := session.StdinPipe()
			err = session.Run(DockerCMD)
			if err != nil {
				log.Error(err)
				return WriteMessage(ws, FailMessage())
			}
			res, _ := ioutil.ReadAll(stdOut)
			WriteByteMessage(ws, res)
			//for _, line := range strings.Split(string(res), "\n")[1:] {

			//dockerStr := strings.Split(line, "\\t")
			//if len(dockerStr) != 4 {
			//	log.Error(errors.New("format error"))
			//	return WriteMessage(ws, NewMessage(Closed, "format error"))
			//}
			//returnData.Docker = append(returnData.Docker, DockerInfo{
			//	ContainerID:   dockerStr[0],
			//	ContainerName: dockerStr[3],
			//	CpuPre:        dockerStr[1],
			//	MemUsageLimit: dockerStr[2],
			//})
			//}
		}
	}
	return

}
