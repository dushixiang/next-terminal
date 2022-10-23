package dto

type TreeMenu struct {
	Title    string     `json:"title"`
	Key      string     `json:"key"`
	Children []TreeMenu `json:"children"`
}
