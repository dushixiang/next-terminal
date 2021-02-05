package term

import (
	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
	"io"
)

type NextTerminal struct {
	SshClient  *ssh.Client
	SshSession *ssh.Session
	StdinPipe  io.WriteCloser
	SftpClient *sftp.Client
	Recorder   *Recorder
	NextWriter *NextWriter
}

func NewNextTerminal(ip string, port int, username, password, privateKey, passphrase string, rows, cols int, recording string) (*NextTerminal, error) {

	sshClient, err := NewSshClient(ip, port, username, password, privateKey, passphrase)
	if err != nil {
		return nil, err
	}

	sshSession, err := sshClient.NewSession()
	if err != nil {
		return nil, err
	}
	//defer sshSession.Close()

	modes := ssh.TerminalModes{
		ssh.ECHO:          1,
		ssh.TTY_OP_ISPEED: 14400,
		ssh.TTY_OP_OSPEED: 14400,
	}

	if err := sshSession.RequestPty("xterm-256color", rows, cols, modes); err != nil {
		return nil, err
	}

	var nextWriter NextWriter
	sshSession.Stdout = &nextWriter
	sshSession.Stderr = &nextWriter

	stdinPipe, err := sshSession.StdinPipe()
	if err != nil {
		return nil, err
	}

	if err := sshSession.Shell(); err != nil {
		return nil, err
	}

	var recorder *Recorder
	if recording != "" {
		recorder, err = CreateRecording(recording, rows, cols)
		if err != nil {
			return nil, err
		}
	}

	terminal := NextTerminal{
		SshClient:  sshClient,
		SshSession: sshSession,
		Recorder:   recorder,
		StdinPipe:  stdinPipe,
		NextWriter: &nextWriter,
	}

	return &terminal, nil
}

func (ret *NextTerminal) Write(p []byte) (int, error) {
	return ret.StdinPipe.Write(p)
}

func (ret *NextTerminal) Read() ([]byte, int, error) {
	return ret.NextWriter.Read()
}

func (ret *NextTerminal) Close() error {
	if ret.SshSession != nil {
		return ret.SshSession.Close()
	}

	if ret.SshClient != nil {
		return ret.SshClient.Close()
	}

	if ret.Recorder != nil {
		return ret.Close()
	}

	return nil
}

func (ret *NextTerminal) WindowChange(h int, w int) error {
	return ret.SshSession.WindowChange(h, w)
}
