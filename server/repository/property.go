package repository

import (
	"github.com/jordan-wright/email"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
	"net/smtp"
	"next-terminal/server/constant"
	"next-terminal/server/guacd"
	"next-terminal/server/model"
)

type PropertyRepository struct {
	DB *gorm.DB
}

func NewPropertyRepository(db *gorm.DB) *PropertyRepository {
	propertyRepository = &PropertyRepository{DB: db}
	return propertyRepository
}

func (r PropertyRepository) FindAll() (o []model.Property) {
	if r.DB.Find(&o).Error != nil {
		return nil
	}
	return
}

func (r PropertyRepository) Create(o *model.Property) (err error) {
	err = r.DB.Create(o).Error
	return
}

func (r PropertyRepository) UpdatePropertyByName(o *model.Property, name string) error {
	o.Name = name
	return r.DB.Updates(o).Error
}

func (r PropertyRepository) FindByName(name string) (o model.Property, err error) {
	err = r.DB.Where("name = ?", name).First(&o).Error
	return
}

func (r PropertyRepository) FindAllMap() map[string]string {
	properties := r.FindAll()
	propertyMap := make(map[string]string)
	for i := range properties {
		propertyMap[properties[i].Name] = properties[i].Value
	}
	return propertyMap
}

func (r PropertyRepository) GetDrivePath() (string, error) {
	property, err := r.FindByName(guacd.DrivePath)
	if err != nil {
		return "", err
	}
	return property.Value, nil
}

func (r PropertyRepository) GetRecordingPath() (string, error) {
	property, err := r.FindByName(guacd.RecordingPath)
	if err != nil {
		return "", err
	}
	return property.Value, nil
}

func (r PropertyRepository) SendMail(to, subject, text string) {
	propertiesMap := r.FindAllMap()
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
