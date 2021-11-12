package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/labstack/echo/v4"
	"net/http"
	"next-terminal/server/model"
	"time"
)

type Backup struct {
	Users            []model.User            `json:"users"`
	UserGroups       []model.UserGroup       `json:"user_groups"`
	UserGroupMembers []model.UserGroupMember `json:"user_group_members"`

	Strategies       []model.Strategy       `json:"strategies"`
	Jobs             []model.Job            `json:"jobs"`
	AccessSecurities []model.AccessSecurity `json:"access_securities"`
	AccessGateways   []model.AccessGateway  `json:"access_gateways"`
	Commands         []model.Command        `json:"commands"`
	Credentials      []model.Credential     `json:"credentials"`
	Assets           []model.Asset          `json:"assets"`
	ResourceSharers  []model.ResourceSharer `json:"resource_sharers"`
}

func BackupExportEndpoint(c echo.Context) error {
	users, err := userRepository.FindAll()
	if err != nil {
		return err
	}
	for i := range users {
		users[i].Password = ""
	}
	userGroups, err := userGroupRepository.FindAll()
	if err != nil {
		return err
	}
	userGroupMembers, err := userGroupRepository.FindAllUserGroupMembers()
	if err != nil {
		return err
	}

	strategies, err := strategyRepository.FindAll()
	if err != nil {
		return err
	}
	jobs, err := jobRepository.FindAll()
	if err != nil {
		return err
	}
	accessSecurities, err := accessSecurityRepository.FindAll()
	if err != nil {
		return err
	}
	accessGateways, err := accessGatewayRepository.FindAll()
	if err != nil {
		return err
	}
	commands, err := commandRepository.FindAll()
	if err != nil {
		return err
	}
	credentials, err := credentialRepository.FindAll()
	if err != nil {
		return err
	}
	assets, err := assetRepository.FindAll()
	if err != nil {
		return err
	}
	resourceSharers, err := resourceSharerRepository.FindAll()
	if err != nil {
		return err
	}

	backup := Backup{
		Users:            users,
		UserGroups:       userGroups,
		UserGroupMembers: userGroupMembers,
		Strategies:       strategies,
		Jobs:             jobs,
		AccessSecurities: accessSecurities,
		AccessGateways:   accessGateways,
		Commands:         commands,
		Credentials:      credentials,
		Assets:           assets,
		ResourceSharers:  resourceSharers,
	}

	jsonBytes, err := json.Marshal(backup)
	if err != nil {
		return err
	}
	c.Response().Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=next-terminal_backup_%s.json", time.Now().Format("20060102150405")))
	return c.Stream(http.StatusOK, echo.MIMEOctetStream, bytes.NewReader(jsonBytes))
}

func BackupImportEndpoint(c echo.Context) error {
	return nil
}
