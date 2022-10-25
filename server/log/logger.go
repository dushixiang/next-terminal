package log

import (
	"os"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"
)

var (
	_logger *zap.Logger // zap ensure that zap.Logger is safe for concurrent use
)

func init() {
	cfg := zap.NewProductionConfig()
	cfg.EncoderConfig.EncodeTime = func(t time.Time, enc zapcore.PrimitiveArrayEncoder) {
		enc.AppendString(t.Format("2006-01-02 15:04:05.000"))
	}

	var cores = []zapcore.Core{
		zapcore.NewCore(
			zapcore.NewConsoleEncoder(cfg.EncoderConfig),
			zapcore.Lock(os.Stdout),
			zap.LevelEnablerFunc(func(level zapcore.Level) bool {
				return level <= zapcore.InfoLevel
			}),
		),
		zapcore.NewCore(
			zapcore.NewJSONEncoder(cfg.EncoderConfig),
			zapcore.AddSync(&lumberjack.Logger{
				Filename:   "logs/next-terminal.log",
				MaxSize:    100,
				MaxAge:     7,
				MaxBackups: 3,
				Compress:   true,
			}),
			zap.LevelEnablerFunc(func(level zapcore.Level) bool {
				return level <= zapcore.InfoLevel
			}),
		),
		zapcore.NewCore(
			zapcore.NewConsoleEncoder(cfg.EncoderConfig),
			zapcore.Lock(os.Stdout),
			zap.LevelEnablerFunc(func(level zapcore.Level) bool {
				return level > zapcore.InfoLevel
			}),
		),
		zapcore.NewCore(
			zapcore.NewJSONEncoder(cfg.EncoderConfig),
			zapcore.AddSync(&lumberjack.Logger{
				Filename:   "logs/next-terminal-error.log",
				MaxSize:    100,
				MaxAge:     7,
				MaxBackups: 3,
				Compress:   true,
			}),
			zap.LevelEnablerFunc(func(level zapcore.Level) bool {
				return level > zapcore.InfoLevel
			}),
		),
	}

	_logger = zap.New(zapcore.NewTee(cores...), zap.AddCaller(), zap.AddStacktrace(zapcore.ErrorLevel))
}

type Field = zap.Field

// function variables for all field types
// in github.com/uber-go/zap/field.go

var (
	Skip        = zap.Skip
	Binary      = zap.Binary
	Bool        = zap.Bool
	Boolp       = zap.Boolp
	ByteString  = zap.ByteString
	Complex128  = zap.Complex128
	Complex128p = zap.Complex128p
	Complex64   = zap.Complex64
	Complex64p  = zap.Complex64p
	Float64     = zap.Float64
	Float64p    = zap.Float64p
	Float32     = zap.Float32
	Float32p    = zap.Float32p
	Int         = zap.Int
	Intp        = zap.Intp
	Int64       = zap.Int64
	Int64p      = zap.Int64p
	Int32       = zap.Int32
	Int32p      = zap.Int32p
	Int16       = zap.Int16
	Int16p      = zap.Int16p
	Int8        = zap.Int8
	Int8p       = zap.Int8p
	String      = zap.String
	Stringp     = zap.Stringp
	Uint        = zap.Uint
	Uintp       = zap.Uintp
	Uint64      = zap.Uint64
	Uint64p     = zap.Uint64p
	Uint32      = zap.Uint32
	Uint32p     = zap.Uint32p
	Uint16      = zap.Uint16
	Uint16p     = zap.Uint16p
	Uint8       = zap.Uint8
	Uint8p      = zap.Uint8p
	Uintptr     = zap.Uintptr
	Uintptrp    = zap.Uintptrp
	Reflect     = zap.Reflect
	Namespace   = zap.Namespace
	Stringer    = zap.Stringer
	Time        = zap.Time
	Timep       = zap.Timep
	Stack       = zap.Stack
	StackSkip   = zap.StackSkip
	Duration    = zap.Duration
	Durationp   = zap.Durationp
	Any         = zap.Any
	NamedError  = zap.NamedError
)

func Debug(msg string, fields ...Field) {
	_logger.Debug(msg, fields...)
}

func Info(msg string, fields ...Field) {
	_logger.Info(msg, fields...)
}

func Warn(msg string, fields ...Field) {
	_logger.Warn(msg, fields...)
}

func Error(msg string, fields ...Field) {
	_logger.Error(msg, fields...)
}
func DPanic(msg string, fields ...Field) {
	_logger.DPanic(msg, fields...)
}
func Panic(msg string, fields ...Field) {
	_logger.Panic(msg, fields...)
}
func Fatal(msg string, fields ...Field) {
	_logger.Fatal(msg, fields...)
}

func Sync() error {
	return _logger.Sync()
}

func GetLogger() *zap.Logger {
	return _logger
}
