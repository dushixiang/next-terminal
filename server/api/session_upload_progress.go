package api

import (
	"fmt"
	"github.com/labstack/echo/v4"
)

type WriteCounter struct {
	Resp  *echo.Response `json:"-"`
	Total uint64         `json:"total"`
}

func (wc *WriteCounter) Write(p []byte) (n int, err error) {
	wc.Total += uint64(len(p))
	// 向前端写入进度
	data := fmt.Sprintf("%d㊥", wc.Total)
	_, _ = wc.Resp.Write([]byte(data))
	wc.Resp.Flush()
	return n, nil
}
