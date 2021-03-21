package utils_test

import (
	"net"
	"testing"

	"next-terminal/server/utils"

	"github.com/stretchr/testify/assert"
)

func TestTcping(t *testing.T) {
	localhost4 := "127.0.0.1"
	localhost6 := "::1"
	conn, err := net.Listen("tcp", ":9999")
	assert.NoError(t, err)
	ip4resfalse := utils.Tcping(localhost4, 22)
	assert.Equal(t, false, ip4resfalse)

	ip4res := utils.Tcping(localhost4, 9999)
	assert.Equal(t, true, ip4res)

	ip6res := utils.Tcping(localhost6, 9999)
	assert.Equal(t, true, ip6res)

	ip4resWithBracket := utils.Tcping("["+localhost4+"]", 9999)
	assert.Equal(t, true, ip4resWithBracket)

	ip6resWithBracket := utils.Tcping("["+localhost6+"]", 9999)
	assert.Equal(t, true, ip6resWithBracket)

	defer func() {
		_ = conn.Close()
	}()
}
