import React, {Component} from 'react';
import Guacamole from 'guacamole-common-js';
import {Affix, Button, Col, Drawer, Dropdown, Form, Input, Menu, message, Modal, Row} from 'antd'
import qs from "qs";
import request from "../../common/request";
import {wsServer} from "../../common/constants";
import {
    AppstoreTwoTone,
    CopyTwoTone,
    DesktopOutlined,
    ExclamationCircleOutlined,
    ExpandOutlined
} from '@ant-design/icons';
import {exitFull, getToken, isEmpty, requestFullScreen} from "../../utils/utils";
import './Access.css'
import Draggable from 'react-draggable';
import FileSystem from "./FileSystem";

const {TextArea} = Input;

const STATE_IDLE = 0;
const STATE_CONNECTING = 1;
const STATE_WAITING = 2;
const STATE_CONNECTED = 3;
const STATE_DISCONNECTING = 4;
const STATE_DISCONNECTED = 5;

class Access extends Component {

    clipboardFormRef = React.createRef();

    state = {
        sessionId: '',
        client: {},
        clientState: STATE_IDLE,
        clipboardVisible: false,
        clipboardText: '',
        containerOverflow: 'hidden',
        containerWidth: 0,
        containerHeight: 0,
        uploadAction: '',
        uploadHeaders: {},
        keyboard: {},
        protocol: '',
        confirmLoading: false,
        uploadVisible: false,
        uploadLoading: false,
        startTime: new Date(),
        fullScreen: false,
        fullScreenBtnText: '进入全屏'
    };

    async componentDidMount() {

        let urlParams = new URLSearchParams(this.props.location.search);
        let assetId = urlParams.get('assetId');
        document.title = urlParams.get('assetName');
        let protocol = urlParams.get('protocol');
        let sessionId = await this.createSession(assetId);
        if (isEmpty(sessionId)) {
            return;
        }

        this.setState({
            sessionId: sessionId,
            protocol: protocol
        });

        this.renderDisplay(sessionId, protocol);

        window.addEventListener('resize', this.onWindowResize);
        window.onfocus = this.onWindowFocus;
    }

    componentWillUnmount() {
        if (this.state.client) {
            this.state.client.disconnect();
        }
    }

    sendClipboard(data) {
        let writer;

        // Create stream with proper mimetype
        const stream = this.state.client.createClipboardStream(data.type);

        // Send data as a string if it is stored as a string
        if (typeof data.data === 'string') {
            writer = new Guacamole.StringWriter(stream);
            writer.sendText(data.data);
            writer.sendEnd();
        } else {

            // Write File/Blob asynchronously
            writer = new Guacamole.BlobWriter(stream);
            writer.oncomplete = function clipboardSent() {
                writer.sendEnd();
            };

            // Begin sending data
            writer.sendBlob(data.data);
        }

        this.setState({
            clipboardText: data.data
        })
        if (this.state.protocol === 'ssh') {
            if (data.data && data.data.length > 0) {
                message.info('您输入的内容已复制到远程服务器上，使用右键将自动粘贴。');
            }
        } else {
            if (data.data && data.data.length > 0) {
                message.info('您输入的内容已复制到远程服务器上');
            }
        }

    }

    onTunnelStateChange = (state) => {
        if (state === Guacamole.Tunnel.State.CLOSED) {
            console.log('web socket 已关闭');
        }
    };

    updateSessionStatus = async (sessionId) => {
        let result = await request.post(`/sessions/${sessionId}/connect`);
        if (result.code !== 1) {
            message.error(result.message);
        }
    }

    onClientStateChange = (state) => {
        this.setState({
            clientState: state
        });
        switch (state) {
            case STATE_IDLE:
                message.destroy();
                message.loading('正在初始化中...', 0);
                break;
            case STATE_CONNECTING:
                message.destroy();
                message.loading('正在努力连接中...', 0);
                break;
            case STATE_WAITING:
                message.destroy();
                message.loading('正在等待服务器响应...', 0);
                break;
            case STATE_CONNECTED:
                this.onWindowResize(null);
                message.destroy();
                message.success('连接成功');
                // 向后台发送请求，更新会话的状态
                this.updateSessionStatus(this.state.sessionId).then(_ => {
                })
                break;
            case STATE_DISCONNECTING:
                message.destroy();
                message.loading('正在关闭连接...', 0);
                break;
            case STATE_DISCONNECTED:
                message.destroy();
                message.error('连接关闭');
                break;
            default:
                break;
        }
    };

    onError = (status) => {

        console.log('通道异常。', status);

        switch (status.code) {
            case 256:
                this.showMessage('未支持的访问');
                break;
            case 512:
                this.showMessage('远程服务异常');
                break;
            case 513:
                this.showMessage('服务器忙碌');
                break;
            case 514:
                this.showMessage('服务器连接超时');
                break;
            case 515:
                this.showMessage('远程服务异常');
                break;
            case 516:
                this.showMessage('资源未找到');
                break;
            case 517:
                this.showMessage('资源冲突');
                break;
            case 518:
                this.showMessage('资源已关闭');
                break;
            case 519:
                if (new Date().getTime() - this.state.startTime.getTime() <= 1000 * 30) {
                    this.showMessage('认证失败');
                } else {
                    this.showMessage('远程服务未找到');
                }
                break;
            case 520:
                this.showMessage('远程服务不可用');
                break;
            case 521:
                this.showMessage('会话冲突');
                break;
            case 522:
                this.showMessage('会话连接超时');
                break;
            case 523:
                this.showMessage('会话已关闭');
                break;
            case 768:
                this.showMessage('网络不可达');
                break;
            case 769:
                this.showMessage('服务器密码验证失败');
                break;
            case 771:
                this.showMessage('客户端被禁止');
                break;
            case 776:
                this.showMessage('客户端连接超时');
                break;
            case 781:
                this.showMessage('客户端异常');
                break;
            case 783:
                this.showMessage('错误的请求类型');
                break;
            case 800:
                this.showMessage('会话不存在');
                break;
            case 801:
                this.showMessage('创建隧道失败');
                break;
            case 802:
                this.showMessage('管理员强制断开了此会话');
                break;
            default:
                this.showMessage('未知错误。');
        }
    };

    showMessage(msg) {
        message.destroy();
        Modal.confirm({
            title: '提示',
            icon: <ExclamationCircleOutlined/>,
            content: msg,
            centered: true,
            okText: '重新连接',
            cancelText: '关闭页面',
            onOk() {
                window.location.reload();
            },
            onCancel() {
                window.close();
            },
        });
    }

    clientClipboardReceived = (stream, mimetype) => {
        let reader;

        // If the received data is text, read it as a simple string
        if (/^text\//.exec(mimetype)) {

            reader = new Guacamole.StringReader(stream);

            // Assemble received data into a single string
            let data = '';
            reader.ontext = function textReceived(text) {
                data += text;
            };

            // Set clipboard contents once stream is finished
            reader.onend = async () => {

                message.info('您选择的内容已复制到您的粘贴板中，在右侧的输入框中可同时查看到。');
                this.setState({
                    clipboardText: data
                });

                if (navigator.clipboard) {
                    await navigator.clipboard.writeText(data);
                }
            };

        }

        // Otherwise read the clipboard data as a Blob
        else {
            reader = new Guacamole.BlobReader(stream, mimetype);
            reader.onend = () => {
                this.setState({
                    clipboardText: reader.getBlob()
                })
            }
        }
    };

    onKeyDown = (keysym) => {
        if (this.state.clipboardVisible || this.state.fileSystemVisible) {
            return true;
        }
        this.state.client.sendKeyEvent(1, keysym);
        if (keysym === 65288) {
            return false;
        }
    };

    onKeyUp = (keysym) => {
        this.state.client.sendKeyEvent(0, keysym);
    };

    fullScreen = () => {
        let fs = this.state.fullScreen;
        if (fs) {
            exitFull();
            this.setState({
                fullScreen: false,
                fullScreenBtnText: '进入全屏'
            })
        } else {
            requestFullScreen(document.documentElement);
            this.setState({
                fullScreen: true,
                fullScreenBtnText: '退出全屏'
            })
        }

    }

    async createSession(assetsId) {
        let result = await request.post(`/sessions?assetId=${assetsId}&mode=guacd`);
        if (result['code'] !== 1) {
            this.showMessage(result['message']);
            return null;
        }
        return result['data']['id'];
    }

    async renderDisplay(sessionId, protocol) {

        let tunnel = new Guacamole.WebSocketTunnel(wsServer + '/tunnel');

        tunnel.onstatechange = this.onTunnelStateChange;
        // Get new client instance
        let client = new Guacamole.Client(tunnel);

        // 设置虚拟机剪贴板内容
        client.sendClipboard = this.sendClipboard;

        // 处理从虚拟机收到的剪贴板内容
        client.onclipboard = this.clientClipboardReceived;

        // 处理客户端的状态变化事件
        client.onstatechange = this.onClientStateChange;

        client.onerror = this.onError;

        // Get display div from document
        const display = document.getElementById("display");

        // Add client to display div
        const element = client.getDisplay().getElement();
        display.appendChild(element);

        let width = window.innerWidth;
        let height = window.innerHeight;
        let dpi = 96;
        if (protocol === 'ssh' || protocol === 'telnet') {
            dpi = dpi * 2;
        }

        let token = getToken();

        let params = {
            'sessionId': sessionId,
            'width': width,
            'height': height,
            'dpi': dpi,
            'X-Auth-Token': token
        };

        let paramStr = qs.stringify(params);

        // Connect
        client.connect(paramStr);

        // Disconnect on close
        window.onunload = function () {
            client.disconnect();
        };

        // Mouse
        const mouse = new Guacamole.Mouse(element);

        mouse.onmousedown = mouse.onmouseup = function (mouseState) {
            client.sendMouseState(mouseState);
        };

        mouse.onmousemove = function (mouseState) {
            if (protocol === 'ssh' || protocol === 'telnet') {
                mouseState.x = mouseState.x * 2;
                mouseState.y = mouseState.y * 2;
                client.sendMouseState(mouseState);
            } else {
                client.sendMouseState(mouseState);
            }
        };

        // Keyboard
        const keyboard = new Guacamole.Keyboard(document);

        keyboard.onkeydown = this.onKeyDown;
        keyboard.onkeyup = this.onKeyUp;

        this.setState({
            client: client,
            containerWidth: width,
            containerHeight: height,
            keyboard: keyboard,
        });
    }

    onWindowResize = (e) => {

        if (this.state.client) {
            const display = this.state.client.getDisplay();

            const width = window.innerWidth;
            const height = window.innerHeight;

            if (this.state.protocol === 'ssh' || this.state.protocol === 'telnet') {
                let r = 2;
                display.scale(1 / r);
                this.state.client.sendSize(width * r, height * r);
            } else {
                this.state.client.sendSize(width, height);
            }

            this.setState({
                containerWidth: width,
                containerHeight: height,
            })

            this.resize(this.state.sessionId, width, height).then(_ => {
            });
        }
    };

    resize = async (sessionId, width, height) => {
        let result = await request.post(`/sessions/${sessionId}/resize?width=${width}&height=${height}`);
        if (result.code !== 1) {
            message.error(result.message);
        }
    }

    onWindowFocus = (e) => {
        if (navigator.clipboard && this.state.clientState === STATE_CONNECTED) {
            navigator.clipboard.readText().then((text) => {
                this.sendClipboard({
                    'data': text,
                    'type': 'text/plain'
                });
            })
        }
    };

    onPaste = (e) => {
        const cbd = e.clipboardData;
        const ua = window.navigator.userAgent;

        // 如果是 Safari 直接 return
        if (!(e.clipboardData && e.clipboardData.items)) {
            return;
        }

        // Mac平台下Chrome49版本以下 复制Finder中的文件的Bug Hack掉
        if (cbd.items && cbd.items.length === 2 && cbd.items[0].kind === "string" && cbd.items[1].kind === "file" &&
            cbd.types && cbd.types.length === 2 && cbd.types[0] === "text/plain" && cbd.types[1] === "Files" &&
            ua.match(/Macintosh/i) && Number(ua.match(/Chrome\/(\d{2})/i)[1]) < 49) {
            return;
        }

        for (let i = 0; i < cbd.items.length; i++) {
            let item = cbd.items[i];
            if (item.kind === "file") {
                let blob = item.getAsFile();
                if (blob.size === 0) {
                    return;
                }
                // blob 就是从剪切板获得的文件 可以进行上传或其他操作
            } else if (item.kind === 'string') {
                item.getAsString((str) => {
                    this.sendClipboard({
                        'data': str,
                        'type': 'text/plain'
                    });
                })
            }
        }
    };

    sendCombinationKey = (keys) => {
        for (let i = 0; i < keys.length; i++) {
            this.state.client.sendKeyEvent(1, keys[i]);
        }
        for (let j = 0; j < keys.length; j++) {
            this.state.client.sendKeyEvent(0, keys[j]);
        }
    }

    render() {

        const menu = (
            <Menu>
                <Menu.Item
                    onClick={() => this.sendCombinationKey(['65507', '65513', '65535'])}>Ctrl+Alt+Delete</Menu.Item>
                <Menu.Item
                    onClick={() => this.sendCombinationKey(['65507', '65513', '65288'])}>Ctrl+Alt+Backspace</Menu.Item>
                <Menu.Item
                    onClick={() => this.sendCombinationKey(['65515', '100'])}>Windows+D</Menu.Item>
                <Menu.Item
                    onClick={() => this.sendCombinationKey(['65515', '101'])}>Windows+E</Menu.Item>
                <Menu.Item
                    onClick={() => this.sendCombinationKey(['65515', '114'])}>Windows+R</Menu.Item>
                <Menu.Item
                    onClick={() => this.sendCombinationKey(['65515', '120'])}>Windows+X</Menu.Item>
                <Menu.Item
                    onClick={() => this.sendCombinationKey(['65515'])}>Windows</Menu.Item>
            </Menu>
        );

        return (
            <div>

                <div className="container" style={{
                    overflow: this.state.containerOverflow,
                    width: this.state.containerWidth,
                    height: this.state.containerHeight
                }}>
                    <div id="display"/>
                </div>

                <Draggable>
                    <Affix style={{position: 'absolute', top: 50, right: 100}}>
                        <Button icon={<ExpandOutlined/>} onClick={() => {
                            this.fullScreen();
                        }}/>
                    </Affix>
                </Draggable>

                <Draggable>
                    <Affix style={{position: 'absolute', top: 50, right: 150}}>
                        <Button icon={<CopyTwoTone/>} onClick={() => {
                            this.setState({
                                clipboardVisible: true
                            });
                        }}/>
                    </Affix>
                </Draggable>

                <Draggable>
                    <Affix style={{position: 'absolute', top: 100, right: 100}}>
                        <Button icon={<AppstoreTwoTone/>} onClick={() => {
                            this.setState({
                                fileSystemVisible: true,
                            });
                        }}/>
                    </Affix>
                </Draggable>

                <Draggable>
                    <Affix style={{position: 'absolute', top: 100, right: 150}}>
                        <Dropdown overlay={menu} trigger={['click']} placement="bottomLeft">
                            <Button icon={<DesktopOutlined/>}/>
                        </Dropdown>
                    </Affix>
                </Draggable>

                <Drawer
                    title={'会话详情'}
                    placement="right"
                    width={window.innerWidth * 0.8}
                    closable={true}
                    // maskClosable={false}
                    onClose={() => {
                        this.setState({
                            fileSystemVisible: false
                        });
                    }}
                    visible={this.state.fileSystemVisible}
                >


                    <Row style={{marginTop: 10}}>
                        <Col span={24}>
                            <FileSystem sessionId={this.state.sessionId}/>
                        </Col>
                    </Row>
                </Drawer>

                {
                    this.state.clipboardVisible ?
                        <Modal
                            title="剪贴板"
                            maskClosable={false}
                            visible={this.state.clipboardVisible}
                            onOk={() => {
                                this.clipboardFormRef.current
                                    .validateFields()
                                    .then(values => {
                                        let clipboardText = values['clipboard'];

                                        this.sendClipboard({
                                            'data': clipboardText,
                                            'type': 'text/plain'
                                        });

                                        this.setState({
                                            clipboardText: clipboardText,
                                            clipboardVisible: false
                                        });
                                    })
                                    .catch(info => {

                                    });
                            }}
                            confirmLoading={this.state.confirmLoading}
                            onCancel={() => {
                                this.setState({
                                    clipboardVisible: false
                                })
                            }}
                        >
                            <Form ref={this.clipboardFormRef} initialValues={{'clipboard': this.state.clipboardText}}>
                                <Form.Item name='clipboard' rules={[{required: false}]}>
                                    <TextArea id='clipboard' rows={10}/>
                                </Form.Item>
                            </Form>
                        </Modal>
                        : undefined
                }

            </div>
        );
    }
}

export default Access;
