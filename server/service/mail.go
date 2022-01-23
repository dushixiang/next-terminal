package service

import (
	"context"
	"net/smtp"

	"next-terminal/server/constant"
	"next-terminal/server/log"
	"next-terminal/server/repository"

	"github.com/jordan-wright/email"
)

type mailService struct {
}

func (r mailService) SendMail(to, subject, text string) {
	propertiesMap := repository.PropertyRepository.FindAllMap(context.TODO())
	host := propertiesMap[constant.MailHost]
	port := propertiesMap[constant.MailPort]
	username := propertiesMap[constant.MailUsername]
	password := propertiesMap[constant.MailPassword]

	if host == "" || port == "" || username == "" || password == "" {
		log.Debugf("邮箱信息不完整，跳过发送邮件。")
		return
	}

	e := email.NewEmail()
	e.From = "Next Terminal <" + username + ">"
	e.To = []string{to}
	e.Subject = subject
	e.Text = []byte(text)
	err := e.Send(host+":"+port, smtp.PlainAuth("", username, password, host))
	if err != nil {
		log.Errorf("邮件发送失败: %v", err.Error())
	}
}
