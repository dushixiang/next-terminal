package service

import (
	"github.com/jordan-wright/email"
	"github.com/sirupsen/logrus"
	"net/smtp"
	"next-terminal/server/constant"
	"next-terminal/server/repository"
)

type MailService struct {
	propertyRepository *repository.PropertyRepository
}

func NewMailService(propertyRepository *repository.PropertyRepository) *MailService {
	return &MailService{propertyRepository: propertyRepository}
}

func (r MailService) SendMail(to, subject, text string) {
	propertiesMap := r.propertyRepository.FindAllMap()
	host := propertiesMap[constant.MailHost]
	port := propertiesMap[constant.MailPort]
	username := propertiesMap[constant.MailUsername]
	password := propertiesMap[constant.MailPassword]

	if host == "" || port == "" || username == "" || password == "" {
		logrus.Debugf("邮箱信息不完整，跳过发送邮件。")
		return
	}

	e := email.NewEmail()
	e.From = "Next Terminal <" + username + ">"
	e.To = []string{to}
	e.Subject = subject
	e.Text = []byte(text)
	err := e.Send(host+":"+port, smtp.PlainAuth("", username, password, host))
	if err != nil {
		logrus.Errorf("邮件发送失败: %v", err.Error())
	}
}
