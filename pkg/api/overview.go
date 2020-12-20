package api

import (
	"next-terminal/pkg/model"
	"fmt"
	"github.com/labstack/echo/v4"
	"github.com/shirou/gopsutil/cpu"
	"github.com/shirou/gopsutil/load"
	"github.com/shirou/gopsutil/mem"
	"time"
)

type OverviewStatus struct {
	Load   Load   `json:"load"`
	Memory Memory `json:"memory"`
	CPU    CPU    `json:"cpu"`
}

type Load struct {
	Load1  float64 `json:"load1"`
	Load5  float64 `json:"load5"`
	Load15 float64 `json:"load15"`
}

type Memory struct {
	Total       uint64  `json:"total"`
	Available   uint64  `json:"available"`
	UsedPercent float64 `json:"usedPercent"`
	Used        uint64  `json:"used"`
}

type CPU struct {
	PhysicalCount int     `json:"physicalCount"`
	LogicalCount  int     `json:"logicalCount"`
	Percent       float64 `json:"percent"`
	ModelName     string  `json:"modelName"`
}

type Counter struct {
	User          int64 `json:"user"`
	Asset         int64 `json:"asset"`
	Credential    int64 `json:"credential"`
	OnlineSession int64 `json:"onlineSession"`
}

func OverviewStatusEndPoint(c echo.Context) error {
	info, _ := load.Avg()
	memory, _ := mem.VirtualMemory()
	infoStats, _ := cpu.Info()
	physicalCount, _ := cpu.Counts(false)
	logicalCount, _ := cpu.Counts(true)
	cps, _ := cpu.Percent(time.Second, false)

	fmt.Printf("%+v\n", info)
	fmt.Printf("%+v\n", memory)
	fmt.Printf("%+v\n", infoStats)
	fmt.Printf("%+v\n", physicalCount)
	fmt.Printf("%+v\n", logicalCount)
	fmt.Printf("%+v\n", cps)

	overviewStatus := OverviewStatus{
		Load: Load{
			Load1:  info.Load1,
			Load5:  info.Load5,
			Load15: info.Load15,
		},
		Memory: Memory{
			Total:       memory.Total,
			Available:   memory.Available,
			UsedPercent: memory.UsedPercent,
			Used:        memory.Used,
		},
		CPU: CPU{
			PhysicalCount: physicalCount,
			LogicalCount:  logicalCount,
			Percent:       cps[0],
			ModelName:     infoStats[0].ModelName,
		},
	}

	return Success(c, overviewStatus)
}

func OverviewCounterEndPoint(c echo.Context) error {
	countUser, _ := model.CountUser()
	countOnlineSession, _ := model.CountOnlineSession()
	credential, _ := model.CountCredential()
	asset, _ := model.CountAsset()

	counter := Counter{
		User:          countUser,
		OnlineSession: countOnlineSession,
		Credential:    credential,
		Asset:         asset,
	}

	return Success(c, counter)
}
