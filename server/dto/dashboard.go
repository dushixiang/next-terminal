package dto

type Counter struct {
	TotalUser      int64 `json:"totalUser"`
	OnlineUser     int64 `json:"onlineUser"`
	TotalAsset     int64 `json:"totalAsset"`
	ActiveAsset    int64 `json:"activeAsset"`
	OfflineSession int64 `json:"offlineSession"`
	FailLoginCount int64 `json:"failLoginCount"`
}
