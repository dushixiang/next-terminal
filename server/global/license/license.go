package license

type License struct {
	Type       string `json:"type"`       // 类型：免费版 free,会员版 vip, 旗舰版 ultimate, 企业版 enterprise
	MachineId  string `json:"machineId"`  // 唯一机器码：免费版为空
	Assert     int64  `json:"assert"`     // 资产数量
	Concurrent int64  `json:"concurrent"` // 并发数量
	User       int64  `json:"user"`       // 用户数量
	Expired    int64  `json:"expired"`    // 过期时间
}

var CurrentLicense *License
