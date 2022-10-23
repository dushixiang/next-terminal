package utils_test

import (
	"crypto/md5"
	"encoding/base64"
	"encoding/hex"
	"fmt"
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
	ip4resfalse, _ := utils.Tcping(localhost4, 22)
	assert.Equal(t, false, ip4resfalse)

	ip4res, _ := utils.Tcping(localhost4, 9999)
	assert.Equal(t, true, ip4res)

	ip6res, _ := utils.Tcping(localhost6, 9999)
	assert.Equal(t, true, ip6res)

	ip4resWithBracket, _ := utils.Tcping("["+localhost4+"]", 9999)
	assert.Equal(t, true, ip4resWithBracket)

	ip6resWithBracket, _ := utils.Tcping("["+localhost6+"]", 9999)
	assert.Equal(t, true, ip6resWithBracket)

	defer func() {
		_ = conn.Close()
	}()
}

func TestAesEncryptCBC(t *testing.T) {
	origData := []byte("Hello Next Terminal") // 待加密的数据
	md5Sum := fmt.Sprintf("%x", md5.Sum([]byte("next-terminal")))
	key := []byte(md5Sum) // 加密的密钥
	_, err := utils.AesEncryptCBC(origData, key)
	assert.NoError(t, err)
	//assert.Equal(t, "s2xvMRPfZjmttpt+x0MzG9dsWcf1X+h9nt7waLvXpNM=", base64.StdEncoding.EncodeToString(encryptedCBC))
}

func TestAesDecryptCBC(t *testing.T) {
	origData, err := base64.StdEncoding.DecodeString("s2xvMRPfZjmttpt+x0MzG9dsWcf1X+h9nt7waLvXpNM=") // 待解密的数据
	assert.NoError(t, err)
	key := []byte("qwertyuiopasdfgh") // 解密的密钥
	decryptCBC, err := utils.AesDecryptCBC(origData, key)
	assert.NoError(t, err)
	assert.Equal(t, "Hello Next Terminal", string(decryptCBC))
}

func TestPbkdf2(t *testing.T) {
	pbkdf2, err := utils.Pbkdf2("1234")
	assert.NoError(t, err)
	println(hex.EncodeToString(pbkdf2))
}

func TestAesEncryptCBCWithAnyKey(t *testing.T) {
	origData := []byte("admin")                                        // 待加密的数据
	key := []byte(fmt.Sprintf("%x", md5.Sum([]byte("next-terminal")))) // 加密的密钥
	encryptedCBC, err := utils.AesEncryptCBC(origData, key)
	assert.NoError(t, err)
	assert.Equal(t, "3qwawlPxghyiLS5hdr/p0g==", base64.StdEncoding.EncodeToString(encryptedCBC))
}

func TestAesDecryptCBCWithAnyKey(t *testing.T) {
	origData, err := base64.StdEncoding.DecodeString("3qwawlPxghyiLS5hdr/p0g==") // 待解密的数据
	assert.NoError(t, err)
	key := []byte(fmt.Sprintf("%x", md5.Sum([]byte("next-terminal")))) // 加密的密钥
	decryptCBC, err := utils.AesDecryptCBC(origData, key)
	assert.NoError(t, err)
	assert.Equal(t, "admin", string(decryptCBC))
}

func TestGetAvailablePort(t *testing.T) {
	port, err := utils.GetAvailablePort()
	if err != nil {
		println(err)
	}
	println(port)
}

func TestAesEncryptCBC2(t *testing.T) {
	origData := []byte("{\"id\":\"xxxx\",\"opcode\":0,\"code\":0,\"message\":\"\",\"data\":\"\"}") // 待加密的数据
	key, _ := base64.StdEncoding.DecodeString("aLSlrPelViToZvNF1T45PQ==")
	encryptedCBC, err := utils.AesEncryptCBC(origData, key)
	assert.NoError(t, err)
	assert.Equal(t, "3Tbnz0MYHQNTsN2L6QDGCJumbNFsQcmErrRz/KglYI/IDh88lsyOhVi7mgaAs/bjevvJa2F1JT7jUMLsz9/cpw==", base64.StdEncoding.EncodeToString(encryptedCBC))
}

func TestUUID(t *testing.T) {
	println(utils.UUID())
}
