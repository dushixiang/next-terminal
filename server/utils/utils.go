package utils

import (
	"bytes"
	"crypto"
	"crypto/aes"
	"crypto/cipher"
	"crypto/md5"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/sha512"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"fmt"
	"image"
	"image/png"
	"io/ioutil"
	"net"
	"os"
	"path/filepath"
	"reflect"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"golang.org/x/crypto/ssh"
	"golang.org/x/text/encoding/simplifiedchinese"
	"golang.org/x/text/transform"

	"github.com/gofrs/uuid"
	errors2 "github.com/pkg/errors"
	"github.com/sirupsen/logrus"
	"golang.org/x/crypto/pbkdf2"
)

func UUID() string {
	v4, _ := uuid.NewV4()
	return v4.String()
}

func Tcping(ip string, port int) (bool, error) {
	var (
		conn    net.Conn
		err     error
		address string
	)
	strPort := strconv.Itoa(port)
	if strings.HasPrefix(ip, "[") && strings.HasSuffix(ip, "]") {
		// 如果用户有填写中括号就不再拼接
		address = fmt.Sprintf("%s:%s", ip, strPort)
	} else {
		address = fmt.Sprintf("[%s]:%s", ip, strPort)
	}
	if conn, err = net.DialTimeout("tcp", address, 5*time.Second); err != nil {
		return false, err
	}
	defer func() {
		_ = conn.Close()
	}()
	return true, nil
}

func ImageToBase64Encode(img image.Image) (string, error) {
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(buf.Bytes()), nil
}

// 判断所给路径文件/文件夹是否存在
func FileExists(path string) bool {
	_, err := os.Stat(path) //os.Stat获取文件信息
	if err != nil {
		return os.IsExist(err)
	}
	return true
}

// 判断所给路径是否为文件夹
func IsDir(path string) bool {
	s, err := os.Stat(path)
	if err != nil {
		return false
	}
	return s.IsDir()
}

// 判断所给路径是否为文件
func IsFile(path string) bool {
	return !IsDir(path)
}

func GetParentDirectory(directory string) string {
	return filepath.Dir(directory)
}

func MkdirP(path string) error {
	if !FileExists(path) {
		if err := os.MkdirAll(path, os.ModePerm); err != nil {
			return err
		}
		fmt.Printf("创建文件夹: %v \n", path)
	}
	return nil
}

// 去除重复元素
func Distinct(a []string) []string {
	result := make([]string, 0, len(a))
	temp := map[string]struct{}{}
	for _, item := range a {
		if _, ok := temp[item]; !ok {
			temp[item] = struct{}{}
			result = append(result, item)
		}
	}
	return result
}

// 排序+拼接+摘要
func Sign(a []string) string {
	sort.Strings(a)
	data := []byte(strings.Join(a, ""))
	has := md5.Sum(data)
	return fmt.Sprintf("%x", has)
}

func Contains(s []string, str string) bool {
	for _, v := range s {
		if v == str {
			return true
		}
	}
	return false
}

func StructToMap(obj interface{}) map[string]interface{} {
	t := reflect.TypeOf(obj)
	v := reflect.ValueOf(obj)
	if t.Kind() == reflect.Ptr {
		// 如果是指针，则获取其所指向的元素
		t = t.Elem()
		v = v.Elem()
	}

	var data = make(map[string]interface{})
	if t.Kind() == reflect.Struct {
		// 只有结构体可以获取其字段信息
		for i := 0; i < t.NumField(); i++ {
			jsonName := t.Field(i).Tag.Get("json")
			if jsonName != "" {
				data[jsonName] = v.Field(i).Interface()
			} else {
				data[t.Field(i).Name] = v.Field(i).Interface()
			}
		}
	}
	return data
}

func IpToInt(ip string) int64 {
	if len(ip) == 0 {
		return 0
	}
	bits := strings.Split(ip, ".")
	if len(bits) < 4 {
		return 0
	}
	b0 := StringToInt(bits[0])
	b1 := StringToInt(bits[1])
	b2 := StringToInt(bits[2])
	b3 := StringToInt(bits[3])

	var sum int64
	sum += int64(b0) << 24
	sum += int64(b1) << 16
	sum += int64(b2) << 8
	sum += int64(b3)

	return sum
}

func StringToInt(in string) (out int) {
	out, _ = strconv.Atoi(in)
	return
}

func Check(f func() error) {
	if err := f(); err != nil {
		logrus.Error("Received error:", err)
	}
}

func ParseNetReg(line string, reg *regexp.Regexp, shouldLen, index int) (int64, string, error) {
	rx1 := reg.FindStringSubmatch(line)
	if len(rx1) != shouldLen {
		return 0, "", errors.New("find string length error")
	}
	i64, err := strconv.ParseInt(rx1[index], 10, 64)
	total := rx1[2]
	if err != nil {
		return 0, "", errors2.Wrap(err, "ParseInt error")
	}
	return i64, total, nil
}

func PKCS5Padding(ciphertext []byte, blockSize int) []byte {
	padding := blockSize - len(ciphertext)%blockSize
	padText := bytes.Repeat([]byte{byte(padding)}, padding)
	return append(ciphertext, padText...)
}

func PKCS5UnPadding(origData []byte) []byte {
	length := len(origData)
	unPadding := int(origData[length-1])
	return origData[:(length - unPadding)]
}

// AesEncryptCBC /*
func AesEncryptCBC(origData, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	blockSize := block.BlockSize()
	origData = PKCS5Padding(origData, blockSize)
	blockMode := cipher.NewCBCEncrypter(block, key[:blockSize])
	encrypted := make([]byte, len(origData))
	blockMode.CryptBlocks(encrypted, origData)
	return encrypted, nil
}

func AesDecryptCBC(encrypted, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	blockSize := block.BlockSize()
	blockMode := cipher.NewCBCDecrypter(block, key[:blockSize])
	origData := make([]byte, len(encrypted))
	blockMode.CryptBlocks(origData, encrypted)
	origData = PKCS5UnPadding(origData)
	return origData, nil
}

func Pbkdf2(password string) ([]byte, error) {
	//生成随机盐
	salt := make([]byte, 32)
	_, err := rand.Read(salt)
	if err != nil {
		return nil, err
	}
	//生成密文
	dk := pbkdf2.Key([]byte(password), salt, 1, 32, sha256.New)
	return dk, nil
}

func DeCryptPassword(cryptPassword string, key []byte) (string, error) {
	origData, err := base64.StdEncoding.DecodeString(cryptPassword)
	if err != nil {
		return "", err
	}
	decryptedCBC, err := AesDecryptCBC(origData, key)
	if err != nil {
		return "", err
	}
	return string(decryptedCBC), nil
}

func RegexpFindSubString(text string, reg *regexp.Regexp) (ret string, err error) {
	findErr := errors.New("regexp find failed")
	res := reg.FindStringSubmatch(text)
	if len(res) != 2 {
		return "", findErr
	}
	return res[1], nil

}

func String2int(s string) (int, error) {
	i, err := strconv.Atoi(s)
	if err != nil {
		return 0, err
	}
	return i, nil
}

func RunCommand(client *ssh.Client, command string) (stdout string, err error) {
	session, err := client.NewSession()
	if err != nil {
		return "", err
	}
	defer session.Close()

	var buf bytes.Buffer
	session.Stdout = &buf
	err = session.Run(command)
	if err != nil {
		return "", err
	}
	stdout = buf.String()
	return
}

func TimeWatcher(name string) {
	start := time.Now()
	defer func() {
		cost := time.Since(start)
		fmt.Printf("%s: %v\n", name, cost)
	}()
}

func DirSize(path string) (int64, error) {
	var size int64
	err := filepath.Walk(path, func(_ string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			size += info.Size()
		}
		return err
	})
	return size, err
}

func Utf8ToGbk(s []byte) ([]byte, error) {
	reader := transform.NewReader(bytes.NewReader(s), simplifiedchinese.GBK.NewEncoder())
	d, e := ioutil.ReadAll(reader)
	if e != nil {
		return nil, e
	}
	return d, nil
}

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

// GetAvailablePort 获取可用端口
func GetAvailablePort() (int, error) {
	addr, err := net.ResolveTCPAddr("tcp", "localhost:0")
	if err != nil {
		return 0, err
	}

	l, err := net.ListenTCP("tcp", addr)
	if err != nil {
		return 0, err
	}

	defer func(l *net.TCPListener) {
		_ = l.Close()
	}(l)
	return l.Addr().(*net.TCPAddr).Port, nil
}

func InsertSlice(index int, new []rune, src []rune) (ns []rune) {
	ns = append(ns, src[:index]...)
	ns = append(ns, new...)
	ns = append(ns, src[index:]...)
	return ns
}

func GetLocalIp() (string, error) {
	addrs, err := net.InterfaceAddrs()

	if err != nil {
		return "", err
	}

	for _, address := range addrs {
		// 检查ip地址判断是否回环地址
		if ipNet, ok := address.(*net.IPNet); ok && !ipNet.IP.IsLoopback() {
			if ipNet.IP.To4() != nil {
				return ipNet.IP.String(), nil
			}
		}
	}

	return "", errors.New("获取本机IP地址失败")
}
