package log

import (
	"io"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/gommon/log"
	"github.com/sirupsen/logrus"
)

// Logrus : implement Logger
type Logrus struct {
	*logrus.Logger
}

// Logger ...
var Logger = logrus.New()

// GetEchoLogger for e.Logger
func GetEchoLogger() Logrus {
	return Logrus{Logger}
}

// Level returns logger level
func (l Logrus) Level() log.Lvl {
	switch l.Logger.Level {
	case logrus.DebugLevel:
		return log.DEBUG
	case logrus.WarnLevel:
		return log.WARN
	case logrus.ErrorLevel:
		return log.ERROR
	case logrus.InfoLevel:
		return log.INFO
	default:
		l.Panic("Invalid level")
	}

	return log.OFF
}

// SetHeader is a stub to satisfy interface
// It's controlled by Logger
func (l Logrus) SetHeader(_ string) {}

// SetPrefix It's controlled by Logger
func (l Logrus) SetPrefix(s string) {}

// Prefix It's controlled by Logger
func (l Logrus) Prefix() string {
	return ""
}

// SetLevel set level to logger from given log.Lvl
func (l Logrus) SetLevel(lvl log.Lvl) {
	switch lvl {
	case log.DEBUG:
		Logger.SetLevel(logrus.DebugLevel)
	case log.WARN:
		Logger.SetLevel(logrus.WarnLevel)
	case log.ERROR:
		Logger.SetLevel(logrus.ErrorLevel)
	case log.INFO:
		Logger.SetLevel(logrus.InfoLevel)
	default:
		l.Panic("Invalid level")
	}
}

// Output logger output func
func (l Logrus) Output() io.Writer {
	return l.Out
}

// SetOutput change output, default os.Stdout
func (l Logrus) SetOutput(w io.Writer) {
	Logger.SetOutput(w)
}

// Printj print json log
func (l Logrus) Printj(j log.JSON) {
	Logger.WithFields(logrus.Fields(j)).Print()
}

// Debugj debug json log
func (l Logrus) Debugj(j log.JSON) {
	Logger.WithFields(logrus.Fields(j)).Debug()
}

// Infoj info json log
func (l Logrus) Infoj(j log.JSON) {
	Logger.WithFields(logrus.Fields(j)).Info()
}

// Warnj warning json log
func (l Logrus) Warnj(j log.JSON) {
	Logger.WithFields(logrus.Fields(j)).Warn()
}

// Errorj error json log
func (l Logrus) Errorj(j log.JSON) {
	Logger.WithFields(logrus.Fields(j)).Error()
}

// Fatalj fatal json log
func (l Logrus) Fatalj(j log.JSON) {
	Logger.WithFields(logrus.Fields(j)).Fatal()
}

// Panicj panic json log
func (l Logrus) Panicj(j log.JSON) {
	Logger.WithFields(logrus.Fields(j)).Panic()
}

// Print string log
func (l Logrus) Print(i ...interface{}) {
	Logger.Print(i[0].(string))
}

// Debug string log
func (l Logrus) Debug(i ...interface{}) {
	Logger.Debug(i[0].(string))
}

// Info string log
func (l Logrus) Info(i ...interface{}) {
	Logger.Info(i[0].(string))
}

// Warn string log
func (l Logrus) Warn(i ...interface{}) {
	Logger.Warn(i[0].(string))
}

// Error string log
func (l Logrus) Error(i ...interface{}) {
	Logger.Error(i[0].(string))
}

// Fatal string log
func (l Logrus) Fatal(i ...interface{}) {
	Logger.Fatal(i[0].(string))
}

// Panic string log
func (l Logrus) Panic(i ...interface{}) {
	Logger.Panic(i[0].(string))
}

func logrusMiddlewareHandler(c echo.Context, next echo.HandlerFunc) error {
	req := c.Request()
	res := c.Response()
	start := time.Now()
	if err := next(c); err != nil {
		c.Error(err)
	}
	stop := time.Now()

	p := req.URL.Path

	bytesIn := req.Header.Get(echo.HeaderContentLength)

	Logger.WithFields(map[string]interface{}{
		"time_rfc3339":  time.Now().Format(time.RFC3339),
		"remote_ip":     c.RealIP(),
		"host":          req.Host,
		"uri":           req.RequestURI,
		"method":        req.Method,
		"path":          p,
		"referer":       req.Referer(),
		"user_agent":    req.UserAgent(),
		"status":        res.Status,
		"latency":       strconv.FormatInt(stop.Sub(start).Nanoseconds()/1000, 10),
		"latency_human": stop.Sub(start).String(),
		"bytes_in":      bytesIn,
		"bytes_out":     strconv.FormatInt(res.Size, 10),
	}).Info("Handled request")

	return nil
}

func logger(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		return logrusMiddlewareHandler(c, next)
	}
}

// Hook is a function to process log.
func Hook() echo.MiddlewareFunc {
	return logger
}
