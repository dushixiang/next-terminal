package utils_test

import (
	"encoding/base64"
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

func TestAesEncryptCBC(t *testing.T) {
	origData := []byte("Hello Next Terminal") // 待加密的数据
	key := []byte("qwertyuiopasdfgh")         // 加密的密钥
	encryptedCBC, err := utils.AesEncryptCBC(origData, key)
	assert.NoError(t, err)
	assert.Equal(t, "s2xvMRPfZjmttpt+x0MzG9dsWcf1X+h9nt7waLvXpNM=", base64.StdEncoding.EncodeToString(encryptedCBC))
}

func TestAesDecryptCBC(t *testing.T) {
	origData, err := base64.StdEncoding.DecodeString("s2xvMRPfZjmttpt+x0MzG9dsWcf1X+h9nt7waLvXpNM=") // 待解密的数据
	assert.NoError(t, err)
	key := []byte("qwertyuiopasdfgh") // 解密的密钥
	decryptCBC, err := utils.AesDecryptCBC(origData, key)
	assert.NoError(t, err)
	assert.Equal(t, "Hello Next Terminal", string(decryptCBC))
}
