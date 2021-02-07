package term

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
	Timestamp int    `json:"Timestamp"`
}

type Recorder struct {
	File      *os.File
	Timestamp int
}

func NewRecorder(recoding string) (recorder *Recorder, err error) {
	recorder = &Recorder{}

	parentDirectory := utils.GetParentDirectory(recoding)

	if utils.FileExists(parentDirectory) {
		if err := os.RemoveAll(parentDirectory); err != nil {
			return nil, err
		}
	}

	if err = os.MkdirAll(parentDirectory, 0777); err != nil {
		return
	}

	var file *os.File
	file, err = os.Create(recoding)
	if err != nil {
		return nil, err
	}

	recorder.File = file
	return recorder, nil
}

func (recorder *Recorder) Close() {
	if recorder.File != nil {
		recorder.File.Close()
	}
}

func (recorder *Recorder) WriteHeader(header *Header) (err error) {
	var p []byte

	if p, err = json.Marshal(header); err != nil {
		return
	}

	if _, err := recorder.File.Write(p); err != nil {
		return err
	}
	if _, err := recorder.File.Write([]byte("\n")); err != nil {
		return err
	}

	recorder.Timestamp = header.Timestamp

	return
}

func (recorder *Recorder) WriteData(data string) (err error) {
	now := int(time.Now().UnixNano())

	delta := float64(now-recorder.Timestamp*1000*1000*1000) / 1000 / 1000 / 1000

	row := make([]interface{}, 0)
	row = append(row, delta)
	row = append(row, "o")
	row = append(row, data)

	var s []byte
	if s, err = json.Marshal(row); err != nil {
		return
	}
	if _, err := recorder.File.Write(s); err != nil {
		return err
	}
	if _, err := recorder.File.Write([]byte("\n")); err != nil {
		return err
	}
	return
}

func CreateRecording(recordingPath string, h int, w int) (*Recorder, error) {
	recorder, err := NewRecorder(recordingPath)
	if err != nil {
		return nil, err
	}

	header := &Header{
		Title:     "",
		Version:   2,
		Height:    42,
		Width:     150,
		Env:       Env{Shell: "/bin/bash", Term: "xterm-256color"},
		Timestamp: int(time.Now().Unix()),
	}

	if err := recorder.WriteHeader(header); err != nil {
		return nil, err
	}

	return recorder, nil
}
