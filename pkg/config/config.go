package config

import (
	"strings"

	"github.com/spf13/pflag"

	"github.com/spf13/viper"
)

var GlobalCfg *Config

type Config struct {
	Debug              bool
	Demo               bool
	DB                 string
	Server             *Server
	Mysql              *Mysql
	Sqlite             *Sqlite
	ResetPassword      string
	ResetTotp          string
	EncryptionKey      string
	EncryptionPassword []byte
	NewEncryptionKey   string
}

type Mysql struct {
	Hostname string
	Port     int
	Username string
	Password string
	Database string
}

type Sqlite struct {
	File string
}

type Server struct {
	Addr string
	Cert string
	Key  string
}

func SetupConfig() *Config {

	viper.SetConfigName("config")
	viper.SetConfigType("yml")
	viper.AddConfigPath("/etc/next-terminal/")
	viper.AddConfigPath("$HOME/.next-terminal")
	viper.AddConfigPath(".")
	viper.AutomaticEnv()
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	pflag.String("db", "sqlite", "db mode")
	pflag.String("sqlite.file", "next-terminal.db", "sqlite db file")
	pflag.String("mysql.hostname", "127.0.0.1", "mysql hostname")
	pflag.Int("mysql.port", 3306, "mysql port")
	pflag.String("mysql.username", "mysql", "mysql username")
	pflag.String("mysql.password", "mysql", "mysql password")
	pflag.String("mysql.database", "next_terminal", "mysql database")

	pflag.String("server.addr", "", "server listen addr")
	pflag.String("server.cert", "", "tls cert file")
	pflag.String("server.key", "", "tls key file")
	pflag.String("reset-password", "", "")
	pflag.String("encryption-key", "", "")
	pflag.String("new-encryption-key", "", "")

	pflag.Parse()
	_ = viper.BindPFlags(pflag.CommandLine)
	_ = viper.ReadInConfig()

	var config = &Config{
		DB: viper.GetString("db"),
		Mysql: &Mysql{
			Hostname: viper.GetString("mysql.hostname"),
			Port:     viper.GetInt("mysql.port"),
			Username: viper.GetString("mysql.username"),
			Password: viper.GetString("mysql.password"),
			Database: viper.GetString("mysql.database"),
		},
		Sqlite: &Sqlite{
			File: viper.GetString("sqlite.file"),
		},
		Server: &Server{
			Addr: viper.GetString("server.addr"),
			Cert: viper.GetString("server.cert"),
			Key:  viper.GetString("server.key"),
		},
		ResetPassword:    viper.GetString("reset-password"),
		ResetTotp:        viper.GetString("reset-totp"),
		Debug:            viper.GetBool("debug"),
		Demo:             viper.GetBool("demo"),
		EncryptionKey:    viper.GetString("encryption-key"),
		NewEncryptionKey: viper.GetString("new-encryption-key"),
	}
	GlobalCfg = config
	return config
}

func init() {
	GlobalCfg = SetupConfig()
}
