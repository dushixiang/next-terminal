package utils

import "testing"

func TestExec(t *testing.T) {
	commands := []string{
		`pwd`,
		`whoami`,
		`cat /etc/resolv.conf`,
		`echo "test" > /tmp/ddtest`,
		`rm -rf /tmp/ddtest`,
	}
	for _, command := range commands {
		output, errout, err := Exec(command)
		if err != nil {
			t.Fatal(err)
		}
		t.Log("output:", output)
		t.Log("errout:", errout)
	}

}
