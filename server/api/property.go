package api

import (
	"context"

	"next-terminal/server/repository"
	"next-terminal/server/service"

	"github.com/labstack/echo/v4"
)

type PropertyApi struct{}

func (api PropertyApi) PropertyGetEndpoint(c echo.Context) error {
	properties := repository.PropertyRepository.FindAllMap(context.TODO())
	return Success(c, properties)
}

func (api PropertyApi) PropertyUpdateEndpoint(c echo.Context) error {
	var item map[string]interface{}
	if err := c.Bind(&item); err != nil {
		return err
	}

	if err := service.PropertyService.Update(item); err != nil {
		return err
	}
	return Success(c, nil)
}
