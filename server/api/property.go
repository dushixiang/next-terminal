package api

import (
	"errors"
	"fmt"

	"next-terminal/server/model"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func PropertyGetEndpoint(c echo.Context) error {
	properties := propertyRepository.FindAllMap()
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

		_, err := propertyRepository.FindByName(key)
		if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
			if err := propertyRepository.Create(&property); err != nil {
				return err
			}
		} else {
			if err := propertyRepository.UpdateByName(&property, key); err != nil {
				return err
			}
		}
	}
	return Success(c, nil)
}
