package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"next-terminal/server/dto"
	"next-terminal/server/service"

	"github.com/labstack/echo/v4"
)

type BackupApi struct{}

func (api BackupApi) BackupExportEndpoint(c echo.Context) error {
	err, backup := service.BackupService.Export()
	if err != nil {
		return err
	}

	jsonBytes, err := json.Marshal(backup)
	if err != nil {
		return err
	}
	c.Response().Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=next-terminal_backup_%s.json", time.Now().Format("20060102150405")))
	return c.Stream(http.StatusOK, echo.MIMEOctetStream, bytes.NewReader(jsonBytes))
}

func (api BackupApi) BackupImportEndpoint(c echo.Context) error {
	var backup dto.Backup
	if err := c.Bind(&backup); err != nil {
		return err
	}
	if err := service.BackupService.Import(&backup); err != nil {
		return err
	}
	return Success(c, "")
}
