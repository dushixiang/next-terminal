package dto

import "next-terminal/server/model"

type Authorization struct {
	Token    string
	Remember bool
	Type     string // LoginToken: 登录令牌, AccessToken: 授权令牌, ShareSession: 会话分享, AccessSession: 只允许访问特定的会话
	User     *model.User
	Roles    []string
}

type LoginAccount struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Remember bool   `json:"remember"`
	TOTP     string `json:"totp"`
}

type ConfirmTOTP struct {
	Secret string `json:"secret"`
	TOTP   string `json:"totp"`
}

type ChangePassword struct {
	NewPassword string `json:"newPassword"`
	OldPassword string `json:"oldPassword"`
}
