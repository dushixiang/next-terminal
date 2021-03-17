package constant

const (
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

	Guacd = "guacd" // 接入模式：guacd
	Naive = "naive" // 接入模式：原生

	TypeUser  = "user"  // 普通用户
	TypeAdmin = "admin" // 管理员
)
