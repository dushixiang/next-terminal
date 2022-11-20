package utils

import (
	"bytes"
	"os/exec"
)

// Exec 执行shell命令
func Exec(command string) (string, string, error) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer

	cmd := exec.Command("bash", "-c", command)
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err := cmd.Run()
	return stdout.String(), stderr.String(), err
}
