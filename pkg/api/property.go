package api

import (
	"fmt"
	"github.com/labstack/echo/v4"
	"next-terminal/pkg/model"
)

func PropertyGetEndpoint(c echo.Context) error {
	properties := model.FindAllPropertiesMap()
	return Success(c, properties)
}

func PropertyUpdateEndpoint(c echo.Context) error {
	var item map[string]interface{}
	if err := c.Bind(&item); err != nil {
		return err
	}

	for key := range item {
		value := fmt.Sprintf("%v", item[key])
		property := model.Property{
			Name:  key,
			Value: value,
		}
		model.UpdatePropertyByName(&property, key)
	}
	return Success(c, nil)
}
