package constant

import (
	"next-terminal/server/guacd"
)

const (
	Version = "v1.2.3"
	Banner  = `
	_______                   __    ___________                  .__              .__
	\      \   ____ ___  ____/  |_  \__    ___/__________  _____ |__| ____ _____  |  |
	/   |   \_/ __ \\  \/  /\   __\   |    |_/ __ \_  __ \/     \|  |/    \\__  \ |  |
	/    |    \  ___/ >    <  |  |     |    |\  ___/|  | \/  Y Y  \  |   |  \/ __ \|  |__
	\____|__  /\___  >__/\_ \ |__|     |____| \___  >__|  |__|_|  /__|___|  (____  /____/
	       \/     \/      \/                     \/            \/        \/     \/      %s
	
	`
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
	Naive    = "naive"    // 接入模式：原生
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
)

var SSHParameterNames = []string{guacd.FontName, guacd.FontSize, guacd.ColorScheme, guacd.Backspace, guacd.TerminalType, SshMode, SocksProxyEnable, SocksProxyHost, SocksProxyPort, SocksProxyUsername, SocksProxyPassword}
var RDPParameterNames = []string{guacd.Domain, guacd.RemoteApp, guacd.RemoteAppDir, guacd.RemoteAppArgs, guacd.EnableDrive, guacd.DrivePath, guacd.ColorDepth, guacd.ForceLossless}
var VNCParameterNames = []string{guacd.ColorDepth, guacd.Cursor, guacd.SwapRedBlue, guacd.DestHost, guacd.DestPort}
var TelnetParameterNames = []string{guacd.FontName, guacd.FontSize, guacd.ColorScheme, guacd.Backspace, guacd.TerminalType, guacd.UsernameRegex, guacd.PasswordRegex, guacd.LoginSuccessRegex, guacd.LoginFailureRegex}
var KubernetesParameterNames = []string{guacd.FontName, guacd.FontSize, guacd.ColorScheme, guacd.Backspace, guacd.TerminalType, guacd.Namespace, guacd.Pod, guacd.Container, guacd.UesSSL, guacd.ClientCert, guacd.ClientKey, guacd.CaCert, guacd.IgnoreCert}
