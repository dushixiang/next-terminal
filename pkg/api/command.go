package api

import (
	"github.com/labstack/echo/v4"
	"next-terminal/pkg/model"
	"next-terminal/pkg/utils"
	"strconv"
	"strings"
)

func CommandCreateEndpoint(c echo.Context) error {
	var item model.Command
	if err := c.Bind(&item); err != nil {
		return err
	}

	item.ID = utils.UUID()
	item.Created = utils.NowJsonTime()

	if err := model.CreateNewCommand(&item); err != nil {
		return err
	}

	return Success(c, item)
}

func CommandPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	name := c.QueryParam("name")
	content := c.QueryParam("content")

	items, total, _ := model.FindPageCommand(pageIndex, pageSize, name, content)

	return Success(c, H{
		"total": total,
		"items": items,
	})
}

func CommandUpdateEndpoint(c echo.Context) error {
	id := c.Param("id")

	var item model.Command
	if err := c.Bind(&item); err != nil {
		return err
	}

	model.UpdateCommandById(&item, id)

	return Success(c, nil)
}

func CommandDeleteEndpoint(c echo.Context) error {
	id := c.Param("id")
	split := strings.Split(id, ",")
	for i := range split {
		model.DeleteCommandById(split[i])
	}
	return Success(c, nil)
}

func CommandGetEndpoint(c echo.Context) (err error) {
	id := c.Param("id")
	var item model.Command
	if item, err = model.FindCommandById(id); err != nil {
		return err
	}
	return Success(c, item)
}
