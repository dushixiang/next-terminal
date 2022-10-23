package task

import (
	"context"
	"github.com/shirou/gopsutil/v3/load"
	"next-terminal/server/common/nt"
	"next-terminal/server/service"
	"next-terminal/server/utils"
	"strconv"
	"time"

	"next-terminal/server/log"
	"next-terminal/server/repository"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
	"next-terminal/server/global/stat"
)

type Ticker struct {
}

func NewTicker() *Ticker {
	return &Ticker{}
}

func (t *Ticker) SetupTicker() {

	// 每隔一小时删除一次未使用的会话信息
	unUsedSessionTicker := time.NewTicker(time.Minute * 60)
	go func() {
		for range unUsedSessionTicker.C {
			t.deleteUnUsedSession()
		}
	}()

	// 每隔6小时删除超过时长限制的会话
	timeoutSessionTicker := time.NewTicker(time.Hour * 6)
	go func() {
		for range timeoutSessionTicker.C {
			deleteOutTimeSession()
			deleteOutTimeLoginLog()
			deleteOutTimeJobLog()
		}
	}()

	systemLoader := time.NewTicker(time.Second * 5)
	go func() {
		for range systemLoader.C {
			err := systemLoad()
			if err != nil {
				log.Error("采集系统负载失败", log.NamedError("err", err))
			}
		}
	}()
}

func systemLoad() error {

	beforeBytesRead, beforeBytesWrite, err := ioCounter()
	if err != nil {
		return err
	}

	beforeBytesSent, beforeBytesRecv, err := netCounter()
	if err != nil {
		return err
	}

	percent, err := cpu.Percent(time.Second, false)
	if err != nil {
		return err
	}

	afterBytesSent, afterBytesRecv, err := netCounter()
	if err != nil {
		return err
	}

	afterBytesRead, afterBytesWrite, err := ioCounter()
	if err != nil {
		return err
	}

	now := time.Now().Format("15:04:05")

	usage, err := disk.Usage("/")
	if err != nil {
		return err
	}

	stat.SystemLoad.Disk.Total = usage.Total
	stat.SystemLoad.Disk.Used = usage.Used
	stat.SystemLoad.Disk.Available = usage.Total - usage.Used
	stat.SystemLoad.Disk.UsedPercent = float64(usage.Used) * 100 / float64(usage.Total)

	if stat.SystemLoad.Cpu.Count == 0 {
		cpuCount, err := cpu.Counts(true)
		if err != nil {
			return err
		}
		stat.SystemLoad.Cpu.Count = cpuCount

		phyCpuCount, err := cpu.Counts(false)
		if err != nil {
			return err
		}
		stat.SystemLoad.Cpu.PhyCount = phyCpuCount

		infoStats, err := cpu.Info()
		if err != nil {
			return err
		}

		for _, info := range infoStats {
			stat.SystemLoad.Cpu.Info = append(stat.SystemLoad.Cpu.Info, &stat.CpuInfo{
				ModelName: info.ModelName,
				CacheSize: info.CacheSize,
				MHZ:       info.Mhz,
			})
		}
	}

	stat.SystemLoad.Cpu.UsedPercent = percent[0]

	stat.SystemLoad.CpuStat = append(stat.SystemLoad.CpuStat, stat.NewStat(now, utils.Decimal(stat.SystemLoad.Cpu.UsedPercent)))
	if len(stat.SystemLoad.CpuStat) > 30 {
		stat.SystemLoad.CpuStat = stat.SystemLoad.CpuStat[1:]
	}

	avgStat, err := load.Avg()
	if err != nil {
		return err
	}

	stat.SystemLoad.LoadStat = &stat.LoadStat{
		Load1:   avgStat.Load1,
		Load5:   avgStat.Load5,
		Load15:  avgStat.Load15,
		Percent: avgStat.Load1 / float64(stat.SystemLoad.Cpu.Count),
	}

	memoryStat, err := mem.VirtualMemory()
	if err != nil {
		return err
	}

	stat.SystemLoad.Mem.Total = memoryStat.Total
	stat.SystemLoad.Mem.Available = memoryStat.Available
	stat.SystemLoad.Mem.Used = memoryStat.Used
	stat.SystemLoad.Mem.UsedPercent = memoryStat.UsedPercent

	stat.SystemLoad.MemStat = append(stat.SystemLoad.MemStat, stat.NewStat(now, utils.Decimal(stat.SystemLoad.Mem.UsedPercent)))
	if len(stat.SystemLoad.MemStat) > 30 {
		stat.SystemLoad.MemStat = stat.SystemLoad.MemStat[1:]
	}

	stat.SystemLoad.DiskIOStat = append(stat.SystemLoad.DiskIOStat, stat.NewIOStat(now, afterBytesRead-beforeBytesRead, afterBytesWrite-beforeBytesWrite))
	if len(stat.SystemLoad.DiskIOStat) > 30 {
		stat.SystemLoad.DiskIOStat = stat.SystemLoad.DiskIOStat[1:]
	}

	stat.SystemLoad.NetIOStat = append(stat.SystemLoad.NetIOStat, stat.NewIOStat(now, afterBytesRecv-beforeBytesRecv, afterBytesSent-beforeBytesSent))
	if len(stat.SystemLoad.NetIOStat) > 30 {
		stat.SystemLoad.NetIOStat = stat.SystemLoad.NetIOStat[1:]
	}

	return nil
}

func ioCounter() (bytesRead, bytesWrite uint64, err error) {
	diskIO, err := disk.IOCounters()
	if err != nil {
		return 0, 0, err
	}
	for _, v := range diskIO {
		bytesRead += v.ReadBytes
		bytesWrite += v.WriteBytes
	}

	return bytesRead, bytesWrite, nil
}

func netCounter() (bytesSent, bytesRecv uint64, err error) {
	netIO, err := net.IOCounters(true)
	if err != nil {
		return 0, 0, err
	}
	for _, v := range netIO {
		bytesSent += v.BytesSent
		bytesRecv += v.BytesRecv
	}
	return bytesSent, bytesRecv, nil
}

func (t *Ticker) deleteUnUsedSession() {
	sessions, err := repository.SessionRepository.FindByStatusIn(context.TODO(), []string{nt.NoConnect, nt.Connecting})
	if err != nil {
		log.Error("查询会话列表失败", log.NamedError("err", err))
		return
	}
	if len(sessions) > 0 {
		now := time.Now()
		for i := range sessions {
			if now.Sub(sessions[i].ConnectedTime.Time) > time.Hour*1 {
				_ = repository.SessionRepository.DeleteById(context.TODO(), sessions[i].ID)
			}
		}
	}
}

func deleteOutTimeSession() {
	property, err := repository.PropertyRepository.FindByName(context.TODO(), "session-saved-limit")
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
	sessions, err := repository.SessionRepository.FindOutTimeSessions(context.TODO(), limit)
	if err != nil {
		return
	}

	if len(sessions) > 0 {
		var ids []string
		for i := range sessions {
			ids = append(ids, sessions[i].ID)
		}
		err := service.SessionService.DeleteByIds(context.TODO(), ids)
		if err != nil {
			log.Error("删除离线会话失败", log.NamedError("err", err))
		}
	}
}

func deleteOutTimeLoginLog() {
	property, err := repository.PropertyRepository.FindByName(context.TODO(), "login-log-saved-limit")
	if err != nil {
		return
	}
	if property.Value == "" || property.Value == "-" {
		return
	}
	limit, err := strconv.Atoi(property.Value)
	if err != nil {
		log.Warn("获取删除登录日志保留时常失败", log.NamedError("err", err))
		return
	}

	loginLogs, err := repository.LoginLogRepository.FindOutTimeLog(context.TODO(), limit)
	if err != nil {
		log.Warn("获取登录日志失败", log.NamedError("err", err))
		return
	}

	if len(loginLogs) > 0 {
		for i := range loginLogs {
			err := repository.LoginLogRepository.DeleteById(context.TODO(), loginLogs[i].ID)
			if err != nil {
				log.Warn("删除登录日志失败", log.NamedError("err", err))
			}
		}
	}
}

func deleteOutTimeJobLog() {
	property, err := repository.PropertyRepository.FindByName(context.TODO(), "cron-log-saved-limit")
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

	jobLogs, err := repository.JobLogRepository.FindOutTimeLog(context.TODO(), limit)
	if err != nil {
		return
	}

	if len(jobLogs) > 0 {
		for i := range jobLogs {
			err := repository.JobLogRepository.DeleteById(context.TODO(), jobLogs[i].ID)
			if err != nil {
				log.Error("删除计划日志失败", log.NamedError("err", err))
			}
		}
	}
}
