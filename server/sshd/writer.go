package sshd

import (
	"encoding/hex"
	"strings"

	"next-terminal/server/api"
	"next-terminal/server/dto"
	"next-terminal/server/global/session"
	"next-terminal/server/term"

	"github.com/gliderlabs/ssh"
)

type Writer struct {
	sessionId string
	sess      *ssh.Session
	recorder  *term.Recorder
	rz        bool
	sz        bool
}

func NewWriter(sessionId string, sess *ssh.Session, recorder *term.Recorder) *Writer {
	return &Writer{sessionId: sessionId, sess: sess, recorder: recorder}
}

func (w *Writer) Write(p []byte) (n int, err error) {
	if w.recorder != nil {
		s := string(p)
		if !w.sz && !w.rz {
			// rz的开头字符
			hexData := hex.EncodeToString(p)
			if strings.Contains(hexData, "727a0d2a2a184230303030303030303030303030300d8a11") {
				w.sz = true
			} else if strings.Contains(hexData, "727a2077616974696e6720746f20726563656976652e2a2a184230313030303030303233626535300d8a11") {
				w.rz = true
			}
		}

		if w.sz {
			// sz 会以 OO 结尾
			if "OO" == s {
				w.sz = false
			}
		} else if w.rz {
			// rz 最后会显示 Received /home/xxx
			if strings.Contains(s, "Received") {
				w.rz = false
				// 把上传的文件名称也显示一下
				err := w.recorder.WriteData(s)
				if err != nil {
					return 0, err
				}
				sendObData(w.sessionId, s)
			}
		} else {
			err := w.recorder.WriteData(s)
			if err != nil {
				return 0, err
			}
			sendObData(w.sessionId, s)
		}
	}
	return (*w.sess).Write(p)
}

func sendObData(sessionId, s string) {
	nextSession := session.GlobalSessionManager.GetById(sessionId)
	if nextSession != nil {
		if nextSession.Observer != nil {
			obs := nextSession.Observer.All()
			for _, ob := range obs {
				_ = api.WriteMessage(ob.WebSocket, dto.NewMessage(api.Data, s))
			}
		}
	}
}
