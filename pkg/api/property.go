package api

import (
	"errors"
	"fmt"

	"next-terminal/pkg/model"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
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
		if value == "" {
			value = "-"
		}

		property := model.Property{
			Name:  key,
			Value: value,
		}

		_, err := model.FindPropertyByName(key)
		if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
			if err := model.CreateNewProperty(&property); err != nil {
				return err
			}
		} else {
			model.UpdatePropertyByName(&property, key)
		}
	}
	return Success(c, nil)
}
