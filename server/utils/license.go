package utils

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha512"
	"crypto/x509"
	"encoding/pem"

	"github.com/denisbrodbeck/machineid"
)

// SignatureRSA rsa私钥签名
func SignatureRSA(plainText []byte, rsaPrivateKey string) (signed []byte, err error) {
	// 使用pem对读取的内容解码得到block
	block, _ := pem.Decode([]byte(rsaPrivateKey))
	//x509将数据解析得到私钥结构体
	privateKey, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		return nil, err
	}
	// 创建一个hash对象
	h := sha512.New()
	_, _ = h.Write(plainText)
	// 计算hash值
	hashText := h.Sum(nil)
	// 使用rsa函数对散列值签名
	signed, err = rsa.SignPKCS1v15(rand.Reader, privateKey, crypto.SHA512, hashText)
	if err != nil {
		return
	}
	return signed, nil
}

// VerifyRSA rsa签名认证
func VerifyRSA(plainText, signText []byte, rsaPublicKey string) bool {
	// pem解码得到block
	block, _ := pem.Decode([]byte(rsaPublicKey))
	// x509解析得到接口
	publicKey, err := x509.ParsePKCS1PublicKey(block.Bytes)
	if err != nil {
		return false
	}
	// 对原始明文进行hash运算得到散列值
	hashText := sha512.Sum512(plainText)
	// 签名认证
	err = rsa.VerifyPKCS1v15(publicKey, crypto.SHA512, hashText[:], signText)
	return err == nil
}

func GetMachineId() (string, error) {
	return machineid.ID()
}
