package stat

type systemLoad struct {
	LoadStat   *LoadStat  `json:"loadStat"`
	Mem        *Mem       `json:"mem"`
	MemStat    []*entry   `json:"memStat"`
	Cpu        *Cpu       `json:"cpu"`
	CpuStat    []*entry   `json:"cpuStat"`
	Disk       *Disk      `json:"disk"`
	DiskIOStat []*ioEntry `json:"diskIO"`
	NetIOStat  []*ioEntry `json:"netIO"`
}

type Mem struct {
	Total       uint64  `json:"total"`
	Available   uint64  `json:"available"`
	Used        uint64  `json:"used"`
	UsedPercent float64 `json:"usedPercent"`
}

type Cpu struct {
	Count       int        `json:"count"`
	PhyCount    int        `json:"phyCount"`
	UsedPercent float64    `json:"usedPercent"`
	Info        []*CpuInfo `json:"info"`
}

type Disk struct {
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Available   uint64  `json:"available"`
	UsedPercent float64 `json:"usedPercent"`
}

type CpuInfo struct {
	ModelName string  `json:"modelName"`
	CacheSize int32   `json:"cacheSize"`
	MHZ       float64 `json:"mhz"`
}

type LoadStat struct {
	Load1   float64 `json:"load1"`
	Load5   float64 `json:"load5"`
	Load15  float64 `json:"load15"`
	Percent float64 `json:"percent"`
}

type entry struct {
	Time  string  `json:"time"`
	Value float64 `json:"value"`
}

func NewStat(time string, value float64) *entry {
	return &entry{
		Time:  time,
		Value: value,
	}
}

func NewIOStat(time string, read, write uint64) *ioEntry {
	return &ioEntry{
		Time:  time,
		Read:  read,
		Write: write,
	}
}

type ioEntry struct {
	Time  string `json:"time"`
	Read  uint64 `json:"read"`
	Write uint64 `json:"write"`
}

var SystemLoad *systemLoad

func init() {
	SystemLoad = &systemLoad{
		LoadStat: &LoadStat{
			Load1:   0,
			Load5:   0,
			Load15:  0,
			Percent: 0,
		},
		Mem: &Mem{
			Total:       0,
			Available:   0,
			Used:        0,
			UsedPercent: 0,
		},
		MemStat: make([]*entry, 0),
		Cpu: &Cpu{
			Count:       0,
			UsedPercent: 0,
		},
		CpuStat: make([]*entry, 0),
		Disk: &Disk{
			Total:       0,
			Used:        0,
			UsedPercent: 0,
		},
		DiskIOStat: make([]*ioEntry, 0),
		NetIOStat:  make([]*ioEntry, 0),
	}
}
