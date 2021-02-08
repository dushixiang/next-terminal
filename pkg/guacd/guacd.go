package guacd

import (
	"bufio"
	"errors"
	"fmt"
	"net"
	"strings"
)

const (
	Host                = "host"
	Port                = "port"
	EnableRecording     = "enable-recording"
	RecordingPath       = "recording-path"
	CreateRecordingPath = "create-recording-path"

	FontName    = "font-name"
	FontSize    = "font-size"
	ColorScheme = "color-scheme"

	EnableDrive              = "enable-drive"
	DriveName                = "drive-name"
	DrivePath                = "drive-path"
	EnableWallpaper          = "enable-wallpaper"
	EnableTheming            = "enable-theming"
	EnableFontSmoothing      = "enable-font-smoothing"
	EnableFullWindowDrag     = "enable-full-window-drag"
	EnableDesktopComposition = "enable-desktop-composition"
	EnableMenuAnimations     = "enable-menu-animations"
	DisableBitmapCaching     = "disable-bitmap-caching"
	DisableOffscreenCaching  = "disable-offscreen-caching"
	DisableGlyphCaching      = "disable-glyph-caching"
)

const Delimiter = ';'
const Version = "VERSION_1_3_0"

type Configuration struct {
	ConnectionID string
	Protocol     string
	Parameters   map[string]string
}

func NewConfiguration() (ret Configuration) {
	ret.Parameters = make(map[string]string)
	return ret
}

func (opt *Configuration) SetParameter(name, value string) {
	opt.Parameters[name] = value
}

func (opt *Configuration) UnSetParameter(name string) {
	delete(opt.Parameters, name)
}

func (opt *Configuration) GetParameter(name string) string {
	return opt.Parameters[name]
}

type Instruction struct {
	Opcode       string
	Args         []string
	ProtocolForm string
}

func NewInstruction(opcode string, args ...string) (ret Instruction) {
	ret.Opcode = opcode
	ret.Args = args
	return ret
}

func (opt *Instruction) String() string {
	if len(opt.ProtocolForm) > 0 {
		return opt.ProtocolForm
	}

	opt.ProtocolForm = fmt.Sprintf("%d.%s", len(opt.Opcode), opt.Opcode)
	for _, value := range opt.Args {
		opt.ProtocolForm += fmt.Sprintf(",%d.%s", len(value), value)
	}
	opt.ProtocolForm += string(Delimiter)
	return opt.ProtocolForm
}

func (opt *Instruction) Parse(content string) Instruction {
	if strings.LastIndex(content, ";") > 0 {
		content = strings.TrimRight(content, ";")
	}
	messages := strings.Split(content, ",")

	var args = make([]string, len(messages))
	for i := range messages {
		lm := strings.Split(messages[i], ".")
		args[i] = lm[1]
	}
	return NewInstruction(args[0], args[1:]...)
}

type Tunnel struct {
	rw     *bufio.ReadWriter
	conn   net.Conn
	UUID   string
	Config Configuration
	IsOpen bool
}

func NewTunnel(address string, config Configuration) (ret *Tunnel, err error) {

	conn, err := net.Dial("tcp", address)
	if err != nil {
		return
	}

	ret = &Tunnel{}
	ret.conn = conn
	ret.rw = bufio.NewReadWriter(bufio.NewReader(conn), bufio.NewWriter(conn))
	ret.Config = config

	selectArg := config.ConnectionID
	if selectArg == "" {
		selectArg = config.Protocol
	}

	if err := ret.WriteInstructionAndFlush(NewInstruction("select", selectArg)); err != nil {
		return nil, err
	}

	args, err := ret.expect("args")
	if err != nil {
		return
	}

	width := config.GetParameter("width")
	height := config.GetParameter("height")
	dpi := config.GetParameter("dpi")

	// send size
	if err := ret.WriteInstructionAndFlush(NewInstruction("size", width, height, dpi)); err != nil {
		return nil, err
	}
	if err := ret.WriteInstructionAndFlush(NewInstruction("audio")); err != nil {
		return nil, err
	}
	if err := ret.WriteInstructionAndFlush(NewInstruction("video")); err != nil {
		return nil, err
	}
	if err := ret.WriteInstructionAndFlush(NewInstruction("image")); err != nil {
		return nil, err
	}
	if err := ret.WriteInstructionAndFlush(NewInstruction("timezone", "Asia/Shanghai")); err != nil {
		return nil, err
	}

	parameters := make([]string, len(args.Args))
	for i := range args.Args {
		argName := args.Args[i]
		if strings.Contains(argName, "VERSION") {
			parameters[i] = Version
			continue
		}
		parameters[i] = config.GetParameter(argName)
	}
	// send connect
	if err := ret.WriteInstructionAndFlush(NewInstruction("connect", parameters...)); err != nil {
		return nil, err
	}

	ready, err := ret.expect("ready")
	if err != nil {
		return
	}

	if len(ready.Args) == 0 {
		return nil, errors.New("no connection id received")
	}

	ret.UUID = ready.Args[0]
	ret.IsOpen = true
	return ret, nil
}

func (opt *Tunnel) WriteInstructionAndFlush(instruction Instruction) error {
	if _, err := opt.WriteAndFlush([]byte(instruction.String())); err != nil {
		return err
	}
	return nil
}

func (opt *Tunnel) WriteInstruction(instruction Instruction) error {
	if _, err := opt.Write([]byte(instruction.String())); err != nil {
		return err
	}
	return nil
}

func (opt *Tunnel) WriteAndFlush(p []byte) (int, error) {
	//fmt.Printf("-> %v \n", string(p))
	nn, err := opt.rw.Write(p)
	if err != nil {
		return nn, err
	}
	err = opt.rw.Flush()
	if err != nil {
		return nn, err
	}
	return nn, nil
}

func (opt *Tunnel) Write(p []byte) (int, error) {
	//fmt.Printf("-> %v \n", string(p))
	nn, err := opt.rw.Write(p)
	if err != nil {
		return nn, err
	}
	return nn, nil
}

func (opt *Tunnel) Flush() error {
	return opt.rw.Flush()
}

func (opt *Tunnel) ReadInstruction() (instruction Instruction, err error) {
	msg, err := opt.rw.ReadString(Delimiter)
	//fmt.Printf("<- %v \n", msg)
	if err != nil {
		return instruction, err
	}
	return instruction.Parse(msg), err
}

func (opt *Tunnel) Read() (p []byte, err error) {
	p, err = opt.rw.ReadBytes(Delimiter)
	//fmt.Printf("<- %v \n", string(p))
	return
}

func (opt *Tunnel) expect(opcode string) (instruction Instruction, err error) {
	instruction, err = opt.ReadInstruction()
	if err != nil {
		return instruction, err
	}

	if opcode != instruction.Opcode {
		msg := fmt.Sprintf(`expected "%s" instruction but instead received "%s"`, opcode, instruction.Opcode)
		return instruction, errors.New(msg)
	}
	return instruction, nil
}

func (opt *Tunnel) Close() error {
	opt.IsOpen = false
	return opt.conn.Close()
}
