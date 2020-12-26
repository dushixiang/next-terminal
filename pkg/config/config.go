package config

import (
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	DB     string
	Server *Server
	Mysql  *Mysql
	Sqlite *Sqlite
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
}

func SetupConfig() (*Config, error) {

	viper.SetConfigName("config")
	viper.SetConfigType("yml")
	viper.AddConfigPath("/etc/next-terminal/")
	viper.AddConfigPath("$HOME/.next-terminal")
	viper.AddConfigPath(".")
	viper.AutomaticEnv()
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	err := viper.ReadInConfig()
	if err != nil {
		return nil, err
	}

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
		},
	}

	return config, nil
}
