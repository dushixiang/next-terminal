package nt

import (
	"next-terminal/server/common/guacamole"
)

const Token = "X-Auth-Token"

type Key string

const (
	DB Key = "db"

	SSH    = "ssh"
	RDP    = "rdp"
	VNC    = "vnc"
	Telnet = "telnet"
	K8s    = "kubernetes"

	AccessRuleAllow  = "allow"  // 允许访问
	AccessRuleReject = "reject" // 拒绝访问

	Custom     = "custom"      // 密码
	PrivateKey = "private-key" // 密钥

	JobStatusRunning        = "running"                // 计划任务运行状态
	JobStatusNotRunning     = "not-running"            // 计划任务未运行状态
	FuncCheckAssetStatusJob = "check-asset-status-job" // 检测资产是否在线
	FuncShellJob            = "shell-job"              // 执行Shell脚本
	JobModeSelf             = "self"                   // 本机
	JobModeAll              = "all"                    // 全部资产
	JobModeCustom           = "custom"                 // 自定义选择资产

	SshMode      = "ssh-mode"      // ssh模式
	MailHost     = "mail-host"     // 邮件服务器地址
	MailPort     = "mail-port"     // 邮件服务器端口
	MailUsername = "mail-username" // 邮件服务账号
	MailPassword = "mail-password" // 邮件服务密码

	NoConnect    = "no_connect"   // 会话状态：未连接
	Connecting   = "connecting"   // 会话状态：连接中
	Connected    = "connected"    // 会话状态：已连接
	Disconnected = "disconnected" // 会话状态：已断开连接

	Guacd    = "guacd"    // 接入模式：guacd
	Native   = "native"   // 接入模式：原生
	Terminal = "terminal" // 接入模式：终端

	TypeUser  = "user"  // 普通用户
	TypeAdmin = "admin" // 管理员

	SourceLdap = "ldap" // 从LDAP同步的用户

	StatusEnabled  = "enabled"
	StatusDisabled = "disabled"

	SocksProxyEnable   = "socks-proxy-enable"
	SocksProxyHost     = "socks-proxy-host"
	SocksProxyPort     = "socks-proxy-port"
	SocksProxyUsername = "socks-proxy-username"
	SocksProxyPassword = "socks-proxy-password"

	LoginToken   = "login-token"
	AccessToken  = "access-token"
	ShareSession = "share-session"

	Anonymous = "anonymous"

	StorageLogActionRm       = "rm"       // 删除
	StorageLogActionUpload   = "upload"   // 上传
	StorageLogActionDownload = "download" // 下载
	StorageLogActionMkdir    = "mkdir"    // 创建文件夹
	StorageLogActionRename   = "rename"   // 重命名
)

var SSHParameterNames = []string{guacamole.FontName, guacamole.FontSize, guacamole.ColorScheme, guacamole.Backspace, guacamole.TerminalType, SshMode, SocksProxyEnable, SocksProxyHost, SocksProxyPort, SocksProxyUsername, SocksProxyPassword}
var RDPParameterNames = []string{guacamole.Domain, guacamole.RemoteApp, guacamole.RemoteAppDir, guacamole.RemoteAppArgs, guacamole.EnableDrive, guacamole.DrivePath, guacamole.ColorDepth, guacamole.ForceLossless, guacamole.PreConnectionId, guacamole.PreConnectionBlob}
var VNCParameterNames = []string{guacamole.ColorDepth, guacamole.Cursor, guacamole.SwapRedBlue, guacamole.DestHost, guacamole.DestPort}
var TelnetParameterNames = []string{guacamole.FontName, guacamole.FontSize, guacamole.ColorScheme, guacamole.Backspace, guacamole.TerminalType, guacamole.UsernameRegex, guacamole.PasswordRegex, guacamole.LoginSuccessRegex, guacamole.LoginFailureRegex}
var KubernetesParameterNames = []string{guacamole.FontName, guacamole.FontSize, guacamole.ColorScheme, guacamole.Backspace, guacamole.TerminalType, guacamole.Namespace, guacamole.Pod, guacamole.Container, guacamole.UesSSL, guacamole.ClientCert, guacamole.ClientKey, guacamole.CaCert, guacamole.IgnoreCert}
