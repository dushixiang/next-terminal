package totp

import (
	otp_t "github.com/pquerna/otp"
	totp_t "github.com/pquerna/otp/totp"
)

type GenerateOpts totp_t.GenerateOpts

func NewTOTP(opt GenerateOpts) (*otp_t.Key, error) {
	return totp_t.Generate(totp_t.GenerateOpts(opt))
}

func Validate(code string, secret string) bool {
	if secret == "" {
		return true
	}
	return totp_t.Validate(code, secret)
}
