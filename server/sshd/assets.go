package sshd

import "next-terminal/server/model"

/*
 * 以下代码是对 server/model/asset.go 中的 AssetForPage 结构体的排序
 */
type _AssetsSortByName []model.AssetForPage

func (a _AssetsSortByName) Len() int {
	return len(a)
}

func (a _AssetsSortByName) Swap(i, j int) {
	a[i], a[j] = a[j], a[i]
}

func (a _AssetsSortByName) Less(i, j int) bool {
	return a[i].Name < a[j].Name
}
