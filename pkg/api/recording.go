package api

import (
	"encoding/json"
	"next-terminal/pkg/utils"
	"os"
	"time"
)

type Env struct {
	Shell string `json:"SHELL"`
	Term  string `json:"TERM"`
}

type Header struct {
	Title     string `json:"title"`
	Version   int    `json:"version"`
	Height    int    `json:"height"`
	Width     int    `json:"width"`
	Env       Env    `json:"env"`
	Timestamp int    `json:"timestamp"`
}

type Recorder struct {
	file      *os.File
	timestamp int
}

func NewRecorder(filename string) (recorder *Recorder, err error) {
	recorder = &Recorder{}

	if utils.FileExists(filename) {
		if err := os.RemoveAll(filename); err != nil {
			return nil, err
		}
	}
	var file *os.File
	file, err = os.Create(filename)
	if err != nil {
		return nil, err
	}

	recorder.file = file
	return recorder, nil
}

func (recorder *Recorder) Close() {
	if recorder.file != nil {
		recorder.file.Close()
	}
}

func (recorder *Recorder) WriteHeader(header *Header) (err error) {
	var p []byte

	if p, err = json.Marshal(header); err != nil {
		return
	}

	if _, err := recorder.file.Write(p); err != nil {
		return err
	}
	if _, err := recorder.file.Write([]byte("\n")); err != nil {
		return err
	}

	recorder.timestamp = header.Timestamp

	return
}

func (recorder *Recorder) WriteData(data string) (err error) {
	now := int(time.Now().UnixNano())

	delta := float64(now-recorder.timestamp*1000*1000*1000) / 1000 / 1000 / 1000

	row := make([]interface{}, 0)
	row = append(row, delta)
	row = append(row, "o")
	row = append(row, data)

	var s []byte
	if s, err = json.Marshal(row); err != nil {
		return
	}
	if _, err := recorder.file.Write(s); err != nil {
		return err
	}
	if _, err := recorder.file.Write([]byte("\n")); err != nil {
		return err
	}
	return
}
