package middleware

import (
	"fmt"
	"os"
	"path"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
	log "github.com/sirupsen/logrus"
)

type NTLog struct {
	*log.Logger
}

func (l *NTLog) Level() {

}

func Logger() *log.Logger {
	now := time.Now()
	logFilePath := ""
	if dir, err := os.Getwd(); err == nil {
		logFilePath = dir + "/log/"
	}
	if err := os.MkdirAll(logFilePath, 0755); err != nil {
		fmt.Println(err.Error())
	}
	// TODO 滚动日志
	logFileName := now.Format("2006-01-02") + ".log"
	//日志文件
	fileName := path.Join(logFilePath, logFileName)
	if _, err := os.Stat(fileName); err != nil {
		if _, err := os.Create(fileName); err != nil {
			fmt.Println(err.Error())
		}
	}
	//写入文件
	src, err := os.OpenFile(fileName, os.O_APPEND|os.O_WRONLY, os.ModeAppend)
	if err != nil {
		fmt.Println("err", err)
	}

	//实例化
	logger := log.New()

	//设置输出
	logger.Out = src
	logger.SetOutput(os.Stdout)

	//设置日志级别
	logger.SetLevel(log.DebugLevel)
	//设置日志格式
	logger.SetFormatter(&log.TextFormatter{
		TimestampFormat: "2006-01-02 15:04:05",
	})
	return logger
}

func LoggerToFile() echo.MiddlewareFunc {
	logger := Logger()
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) (err error) {
			req := c.Request()
			res := c.Response()
			start := time.Now()
			if err = next(c); err != nil {
				c.Error(err)
			}
			stop := time.Now()
			logger.Infof("%s [%v] %s %-7s %s %3d %s %13v %s %s",
				c.RealIP(),
				stop.Format(time.RFC3339),
				req.Host,
				req.Method,
				req.RequestURI,
				res.Status,
				strconv.FormatInt(res.Size, 10),
				stop.Sub(start).String(),
				req.Referer(),
				req.UserAgent(),
			)
			return err

		}
	}

}
