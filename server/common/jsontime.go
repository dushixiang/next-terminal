package common

import (
	"database/sql/driver"
	"fmt"
	"strings"
	"time"
)

type JsonTime struct {
	time.Time
}

func NewJsonTime(t time.Time) JsonTime {
	return JsonTime{
		Time: t,
	}
}

func NowJsonTime() JsonTime {
	return JsonTime{
		Time: time.Now(),
	}
}

func (j JsonTime) MarshalJSON() ([]byte, error) {
	var stamp = fmt.Sprintf("\"%s\"", j.Format("2006-01-02 15:04:05"))
	return []byte(stamp), nil
}

func (j *JsonTime) UnmarshalJSON(b []byte) error {
	s := strings.ReplaceAll(string(b), "\"", "")
	t, err := time.Parse("2006-01-02 15:04:05", s)
	if err != nil {
		return err
	}
	*j = NewJsonTime(t)
	return nil
}

func (j JsonTime) Value() (driver.Value, error) {
	var zeroTime time.Time
	if j.Time.UnixNano() == zeroTime.UnixNano() {
		return nil, nil
	}
	return j.Time, nil
}

func (j *JsonTime) Scan(v interface{}) error {
	value, ok := v.(time.Time)
	if ok {
		*j = JsonTime{Time: value}
		return nil
	}
	return fmt.Errorf("can not convert %v to timestamp", v)
}
