package service

import (
	"context"

	"next-terminal/server/global/security"
	"next-terminal/server/repository"
)

var SecurityService = new(securityService)

type securityService struct{}

func (service securityService) ReloadAccessSecurity() error {
	rules, err := repository.SecurityRepository.FindAll(context.TODO())
	if err != nil {
		return err
	}
	if len(rules) > 0 {
		// 先清空
		security.GlobalSecurityManager.Clear()
		// 再添加到全局的安全管理器中
		for i := 0; i < len(rules); i++ {
			rule := &security.Security{
				ID:       rules[i].ID,
				IP:       rules[i].IP,
				Rule:     rules[i].Rule,
				Priority: rules[i].Priority,
			}
			security.GlobalSecurityManager.Add(rule)
		}
	}
	return nil
}
