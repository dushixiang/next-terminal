package dto

import "next-terminal/server/model"

type RU struct {
	UserGroupId  string   `json:"userGroupId"`
	UserId       string   `json:"userId"`
	StrategyId   string   `json:"strategyId"`
	ResourceType string   `json:"resourceType"`
	ResourceIds  []string `json:"resourceIds"`
}

type UR struct {
	ResourceId   string   `json:"resourceId"`
	ResourceType string   `json:"resourceType"`
	UserIds      []string `json:"userIds"`
}

type Backup struct {
	Users      []model.User      `json:"users"`
	UserGroups []model.UserGroup `json:"user_groups"`

	Storages         []model.Storage          `json:"storages"`
	Strategies       []model.Strategy         `json:"strategies"`
	AccessSecurities []model.AccessSecurity   `json:"access_securities"`
	AccessGateways   []model.AccessGateway    `json:"access_gateways"`
	Commands         []model.Command          `json:"commands"`
	Credentials      []model.Credential       `json:"credentials"`
	Assets           []map[string]interface{} `json:"assets"`
	ResourceSharers  []model.ResourceSharer   `json:"resource_sharers"`
	Jobs             []model.Job              `json:"jobs"`
}
