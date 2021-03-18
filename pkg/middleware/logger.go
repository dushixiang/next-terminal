package middleware

import (
	"fmt"
	"os"
	"path"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/sirupsen/logrus"
)

func Logger() *logrus.Logger {
	now := time.Now()
	logFilePath := ""
	if dir, err := os.Getwd(); err == nil {
		logFilePath = dir + "/log/"
	}
	if err := os.MkdirAll(logFilePath, 0755); err != nil {
		fmt.Println(err.Error())
	}
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
	logger := logrus.New()

	//设置输出
	logger.Out = src
	logger.SetOutput(os.Stdout)

	//设置日志级别
	logger.SetLevel(logrus.DebugLevel)
	//logger.Out := fmt.
	//设置日志格式
	logger.SetFormatter(&logrus.TextFormatter{
		TimestampFormat: "2006-01-02 15:04:05",
	})
	return logger
}

func LoggerToFile() echo.MiddlewareFunc {
	logger := Logger()
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) (err error) {
			if err = next(c); err != nil {
				c.Error(err)
			}
			req := c.Request()
			resp := c.Response()
			startTime := time.Now()

			// 处理请求

			// 结束时间
			endTime := time.Now()

			// 执行时间
			latencyTime := endTime.Sub(startTime)

			// 请求方式
			reqMethod := req.Method

			// 请求路由
			reqUri := req.URL

			// 状态码
			statusCode := resp.Status

			// 请求IP
			clientIP := req.RemoteAddr
			//logger.Formatter
			// TODO log Formatter
			//日志格式
			logger.Infof("| %3d | %13v | %15s | %s | %s |",
				statusCode,
				latencyTime,
				clientIP,
				reqMethod,
				reqUri,
			)
			return
		}
	}

}
