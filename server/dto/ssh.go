package dto

import "strconv"

type Message struct {
	Type    int    `json:"type"`
	Content string `json:"content"`
}

func (r Message) ToString() string {
	if r.Content != "" {
		return strconv.Itoa(r.Type) + r.Content
	} else {
		return strconv.Itoa(r.Type)
	}
}

func NewMessage(_type int, content string) Message {
	return Message{Content: content, Type: _type}
}

func ParseMessage(value string) (message Message, err error) {
	if value == "" {
		return
	}

	_type, err := strconv.Atoi(value[:1])
	if err != nil {
		return
	}
	var content = value[1:]
	message = NewMessage(_type, content)
	return
}

type WindowSize struct {
	Cols int `json:"cols"`
	Rows int `json:"rows"`
}
