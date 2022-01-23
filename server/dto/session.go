package dto

type ExternalSession struct {
	AssetId    string `json:"assetId"`
	FileSystem string `json:"fileSystem"`
	Upload     string `json:"upload"`
	Download   string `json:"download"`
	Delete     string `json:"delete"`
	Rename     string `json:"rename"`
	Edit       string `json:"edit"`
}
