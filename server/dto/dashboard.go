package dto

type Counter struct {
	User          int64 `json:"user"`
	Asset         int64 `json:"asset"`
	Credential    int64 `json:"credential"`
	OnlineSession int64 `json:"onlineSession"`
}
