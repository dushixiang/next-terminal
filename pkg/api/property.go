package api

import (
	"next-terminal/pkg/model"
	"fmt"
	"github.com/labstack/echo/v4"
)

func PropertyGetEndpoint(c echo.Context) error {
	properties := model.FindAllProperties()
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
