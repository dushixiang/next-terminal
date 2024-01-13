package config

import (
	"crypto/md5"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"strings"

	"next-terminal/server/utils"

	"github.com/mitchellh/go-homedir"
	"github.com/spf13/pflag"
	"github.com/spf13/viper"
)

var GlobalCfg *Config

type Config struct {
	Debug              bool
	Demo               bool
	Container          bool
	DB                 string
	Server             *Server
	Mysql              *Mysql
	Sqlite             *Sqlite
	ResetPassword      string
	ResetTotp          string
	EncryptionKey      string
	EncryptionPassword []byte
	NewEncryptionKey   string
	Guacd              *Guacd
	Sshd               *Sshd
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

type Guacd struct {
	Hostname  string
	Port      int
	Recording string
	Drive     string
}

type Sshd struct {
	Enable         bool
	Addr           string
	Key            string
	AuthorizedKeys string
}

func SetupConfig() (*Config, error) {

	viper.SetConfigName("config")
	viper.SetConfigType("yml")
	viper.AddConfigPath("/etc/next-terminal/")
	viper.AddConfigPath("$HOME/.next-terminal")
	viper.AddConfigPath(".")
	viper.AutomaticEnv()
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	pflag.String("db", "sqlite", "db mode")
	pflag.String("sqlite.file", path.Join("/usr/local/next-terminal/data", "sqlite", "next-terminal.db"), "sqlite db file")
	pflag.String("mysql.hostname", "127.0.0.1", "mysql hostname")
	pflag.Int("mysql.port", 3306, "mysql port")
	pflag.String("mysql.username", "mysql", "mysql username")
	pflag.String("mysql.password", "mysql", "mysql password")
	pflag.String("mysql.database", "next-terminal", "mysql database")

	pflag.String("server.addr", "", "server listen addr")
	pflag.String("server.cert", "", "tls cert file")
	pflag.String("server.key", "", "tls key file")
	pflag.String("reset-totp", "", "")
	pflag.String("reset-password", "", "")
	pflag.String("encryption-key", "", "")
	pflag.String("new-encryption-key", "", "")

	pflag.String("guacd.hostname", "127.0.0.1", "")
	pflag.Int("guacd.port", 4822, "")
	pflag.String("guacd.recording", "/usr/local/next-terminal/data/recording", "")
	pflag.String("guacd.drive", "/usr/local/next-terminal/data/drive", "")

	pflag.Bool("sshd.enable", false, "true or false")
	pflag.String("sshd.addr", "", "sshd server listen addr")
	pflag.String("sshd.key", "~/.ssh/id_rsa", "sshd public key filepath")
	pflag.String("sshd.authorized-keys", "/root/.ssh/authorized_keys", "sshd authorized keys filepath")

	pflag.Parse()
	if err := viper.BindPFlags(pflag.CommandLine); err != nil {
		return nil, err
	}
	_ = viper.ReadInConfig()

	sshdKey, err := homedir.Expand(viper.GetString("sshd.key"))
	if err != nil {
		return nil, err
	}

	guacdRecording, err := homedir.Expand(viper.GetString("guacd.recording"))
	if err != nil {
		return nil, err
	}

	guacdDrive, err := homedir.Expand(viper.GetString("guacd.drive"))
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
			Cert: viper.GetString("server.cert"),
			Key:  viper.GetString("server.key"),
		},
		ResetPassword:    viper.GetString("reset-password"),
		ResetTotp:        viper.GetString("reset-totp"),
		Debug:            viper.GetBool("debug"),
		Demo:             viper.GetBool("demo"),
		Container:        viper.GetBool("container"),
		EncryptionKey:    viper.GetString("encryption-key"),
		NewEncryptionKey: viper.GetString("new-encryption-key"),
		Guacd: &Guacd{
			Hostname:  viper.GetString("guacd.hostname"),
			Port:      viper.GetInt("guacd.port"),
			Recording: guacdRecording,
			Drive:     guacdDrive,
		},
		Sshd: &Sshd{
			Enable:         viper.GetBool("sshd.enable"),
			Addr:           viper.GetString("sshd.addr"),
			Key:            sshdKey,
			AuthorizedKeys: viper.GetString("sshd.authorized-keys"),
		},
	}

	if config.EncryptionKey == "" {
		config.EncryptionKey = "next-terminal"
	}
	md5Sum := fmt.Sprintf("%x", md5.Sum([]byte(config.EncryptionKey)))
	config.EncryptionPassword = []byte(md5Sum)

	// 自动创建数据存放目录
	if err := utils.MkdirP(config.Guacd.Recording); err != nil {
		panic(fmt.Sprintf("创建文件夹 %v 失败: %v", config.Guacd.Recording, err.Error()))
	}
	if err := utils.MkdirP(config.Guacd.Drive); err != nil {
		panic(fmt.Sprintf("创建文件夹 %v 失败: %v", config.Guacd.Drive, err.Error()))
	}
	if config.DB == "sqlite" {
		sqliteDir := filepath.Dir(config.Sqlite.File)
		sqliteDir, err := homedir.Expand(sqliteDir)
		if err != nil {
			return nil, err
		}
		if err := utils.MkdirP(sqliteDir); err != nil {
			panic(fmt.Sprintf("创建文件夹 %v 失败: %v", sqliteDir, err.Error()))
		}
	}

	if config.Sshd.Enable && !utils.FileExists(sshdKey) {
		fmt.Printf("检测到本地RSA私钥文件不存在: %v \n", sshdKey)
		sshdKeyDir := filepath.Dir(sshdKey)
		if !utils.FileExists(sshdKeyDir) {
			if err := utils.MkdirP(sshdKeyDir); err != nil {
				panic(fmt.Sprintf("创建文件夹 %v 失败: %v", sshdKeyDir, err.Error()))
			}
		}

		// 自动创建 ID_RSA 密钥
		privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
		if err != nil {
			panic(err)
		}
		//使用X509规范,对公钥私钥进行格式化
		x509PrivateKey := x509.MarshalPKCS1PrivateKey(privateKey)
		block := pem.Block{
			Type:  "RSA PRIVATE KEY",
			Bytes: x509PrivateKey,
		}
		privateKeyFile, _ := os.Create(sshdKey)
		if err := pem.Encode(privateKeyFile, &block); err != nil {
			panic(err)
		}
		_ = privateKeyFile.Close()
		fmt.Printf("自动创建RSA私钥文件成功: %v \n", sshdKey)
	}

	return config, nil
}

func init() {
	var err error
	GlobalCfg, err = SetupConfig()
	if err != nil {
		panic(err)
	}
}
