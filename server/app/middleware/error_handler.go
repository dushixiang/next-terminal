package middleware

import (
	"fmt"
	"next-terminal/server/log"

	"next-terminal/server/api"

	"github.com/labstack/echo/v4"
)

func ErrorHandler(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {

		if err := next(c); err != nil {

			fmt.Printf("%+v\n", err)
			log.Error("api error", log.NamedError("err", err))
			if he, ok := err.(*echo.HTTPError); ok {
				message := fmt.Sprintf("%v", he.Message)
				return api.Fail(c, he.Code, message)
			}

			return api.Fail(c, -1, err.Error())
		}
		return nil
	}
}
