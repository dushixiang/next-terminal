package api

import (
	"github.com/labstack/echo/v4"
	"next-terminal/pkg/model"
	"next-terminal/pkg/utils"
	"strconv"
	"strings"
)

func JobCreateEndpoint(c echo.Context) error {
	var item model.Job
	if err := c.Bind(&item); err != nil {
		return err
	}

	item.ID = utils.UUID()
	item.Created = utils.NowJsonTime()

	if err := model.CreateNewJob(&item); err != nil {
		return err
	}
	return Success(c, "")
}

func JobPagingEndpoint(c echo.Context) error {
	pageIndex, _ := strconv.Atoi(c.QueryParam("pageIndex"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	name := c.QueryParam("name")
	status := c.QueryParam("status")

	order := c.QueryParam("order")
	field := c.QueryParam("field")

	items, total, err := model.FindPageJob(pageIndex, pageSize, name, status, order, field)
	if err != nil {
		return err
	}

	return Success(c, H{
		"total": total,
		"items": items,
	})
}

func JobUpdateEndpoint(c echo.Context) error {
	id := c.Param("id")

	var item model.Job
	if err := c.Bind(&item); err != nil {
		return err
	}

	if err := model.UpdateJobById(&item, id); err != nil {
		return err
	}

	return Success(c, nil)
}

func JobChangeStatusEndpoint(c echo.Context) error {
	id := c.Param("id")
	status := c.QueryParam("status")
	if err := model.ChangeJobStatusById(id, status); err != nil {
		return err
	}
	return Success(c, "")
}

func JobExecEndpoint(c echo.Context) error {
	id := c.Param("id")
	if err := model.ExecJobById(id); err != nil {
		return err
	}
	return Success(c, "")
}

func JobDeleteEndpoint(c echo.Context) error {
	ids := c.Param("id")

	split := strings.Split(ids, ",")
	for i := range split {
		jobId := split[i]
		if err := model.DeleteJobById(jobId); err != nil {
			return err
		}
	}

	return Success(c, nil)
}

func JobGetEndpoint(c echo.Context) error {
	id := c.Param("id")

	item, err := model.FindJobById(id)
	if err != nil {
		return err
	}

	return Success(c, item)
}

func JobGetLogsEndpoint(c echo.Context) error {
	id := c.Param("id")

	items, err := model.FindJobLogs(id)
	if err != nil {
		return err
	}

	return Success(c, items)
}

func JobDeleteLogsEndpoint(c echo.Context) error {
	id := c.Param("id")
	if err := model.DeleteJobLogByJobId(id); err != nil {
		return err
	}
	return Success(c, "")
}
