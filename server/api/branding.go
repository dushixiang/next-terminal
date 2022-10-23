package api

import (
	"next-terminal/server/branding"
	"next-terminal/server/common/maps"

	"github.com/labstack/echo/v4"
)

func Branding(c echo.Context) error {
	return Success(c, maps.Map{
		"name":      branding.Name,
		"copyright": branding.Copyright,
	})
}
