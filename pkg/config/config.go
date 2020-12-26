package config

import (
	"log"
	"strings"

	"github.com/spf13/pflag"
	"github.com/spf13/viper"
)

type Config struct {
	Server *Server
	Mysql  *Mysql
}

type Mysql struct {
	Hostname string
	Port     int
	Username string
	Password string
	Database string
}

type Server struct {
	Addr string
}

func SetupConfig() *Config {

	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("/etc/next-terminal/")
	viper.AddConfigPath("$HOME/.next-terminal")
	viper.AddConfigPath(".")
	viper.AutomaticEnv()
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	//pflag.String("mysql.hostname", "127.0.0.1", "mysql hostname")
	//pflag.Int("mysql.port", 3306, "mysql port")
	//pflag.String("mysql.username", "mysql", "mysql username")
	//pflag.String("mysql.password", "mysql", "mysql password")
	//pflag.String("mysql.database", "next_terminal", "mysql database")
	//pflag.String("server.addr", "0.0.0.0:8088", "server listen addr")

	pflag.Parse()
	_ = viper.BindPFlags(pflag.CommandLine)

	err := viper.ReadInConfig()
	if err != nil {
		log.Fatal(err)
	}

	var config = &Config{
		Mysql: &Mysql{
			Hostname: viper.GetString("mysql.hostname"),
			Port:     viper.GetInt("mysql.port"),
			Username: viper.GetString("mysql.username"),
			Password: viper.GetString("mysql.password"),
			Database: viper.GetString("mysql.database"),
		},
		Server: &Server{
			Addr: viper.GetString("server.addr"),
		},
	}

	return config
}
