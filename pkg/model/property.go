package model

import (
	"github.com/jordan-wright/email"
	"github.com/sirupsen/logrus"
	"net/smtp"
	"next-terminal/pkg/constant"
	"next-terminal/pkg/global"
	"next-terminal/pkg/guacd"
)

type Property struct {
	Name  string `gorm:"primary_key" json:"name"`
	Value string `json:"value"`
}

func (r *Property) TableName() string {
	return "properties"
}

func FindAllProperties() (o []Property) {
	if global.DB.Find(&o).Error != nil {
		return nil
	}
	return
}

func CreateNewProperty(o *Property) (err error) {
	err = global.DB.Create(o).Error
	return
}

func UpdatePropertyByName(o *Property, name string) {
	o.Name = name
	global.DB.Updates(o)
}

func FindPropertyByName(name string) (o Property, err error) {
	err = global.DB.Where("name = ?", name).First(&o).Error
	return
}

func FindAllPropertiesMap() map[string]string {
	properties := FindAllProperties()
	propertyMap := make(map[string]string)
	for i := range properties {
		propertyMap[properties[i].Name] = properties[i].Value
	}
	return propertyMap
}

func GetDrivePath() (string, error) {
	property, err := FindPropertyByName(guacd.DrivePath)
	if err != nil {
		return "", err
	}
	return property.Value, nil
}

func GetRecordingPath() (string, error) {
	property, err := FindPropertyByName(guacd.RecordingPath)
	if err != nil {
		return "", err
	}
	return property.Value, nil
}

func SendMail(to, subject, text string) {
	propertiesMap := FindAllPropertiesMap()
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
