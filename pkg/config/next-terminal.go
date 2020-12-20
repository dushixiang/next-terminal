package config

import (
	"github.com/spf13/viper"
	"log"
)

type NextTerminalConfig struct {
	Dsn  string
	Addr string
}

func SetupConfig() *NextTerminalConfig {

	viper.SetConfigName("next-terminal")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("/etc/next-terminal/")
	viper.AddConfigPath("$HOME/.next-terminal")
	viper.AddConfigPath(".")
	err := viper.ReadInConfig()
	if err != nil {
		log.Fatal(err)
	}

	var config = &NextTerminalConfig{
		Dsn:  viper.GetString("next-terminal.dsn"),
		Addr: viper.GetString("next-terminal.addr"),
	}

	return config
}
