package service

import (
	"context"
	"fmt"
	"net/smtp"
	"next-terminal/server/common/nt"

	"next-terminal/server/branding"
	"next-terminal/server/log"
	"next-terminal/server/repository"

	"github.com/jordan-wright/email"
)

var MailService = new(mailService)

type mailService struct {
}

func (r mailService) SendMail(to, subject, text string) {
	propertiesMap := repository.PropertyRepository.FindAllMap(context.TODO())
	host := propertiesMap[nt.MailHost]
	port := propertiesMap[nt.MailPort]
	username := propertiesMap[nt.MailUsername]
	password := propertiesMap[nt.MailPassword]

	if host == "" || port == "" || username == "" || password == "" {
		log.Warn("邮箱信息不完整，跳过发送邮件。")
		return
	}

	e := email.NewEmail()
	e.From = fmt.Sprintf("%s <%s>", branding.Name, username)
	e.To = []string{to}
	e.Subject = subject
	e.Text = []byte(text)
	err := e.Send(host+":"+port, smtp.PlainAuth("", username, password, host))
	if err != nil {
		log.Error("邮件发送失败", log.String("err", err.Error()))
	}
}
