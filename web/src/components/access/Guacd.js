import React, {useEffect, useState} from 'react';
import {useSearchParams} from "react-router-dom";
import sessionApi from "../../api/session";
import strings from "../../utils/strings";
import Guacamole from "guacamole-common-js";
import {wsServer} from "../../common/env";
import {exitFull, getToken, requestFullScreen} from "../../utils/utils";
import qs from "qs";
import {Affix, Button, Drawer, Dropdown, Menu, message, Modal} from "antd";
import {
    CopyOutlined,
    ExclamationCircleOutlined,
    ExpandOutlined,
    FolderOutlined,
    WindowsOutlined
} from "@ant-design/icons";
import {Base64} from "js-base64";
import Draggable from "react-draggable";
import FileSystem from "../devops/FileSystem";
import GuacdClipboard from "./GuacdClipboard";
import {debounce} from "../../utils/fun";
import './Guacd.css';

let fixedSize = false;

const STATE_IDLE = 0;
const STATE_CONNECTING = 1;
const STATE_WAITING = 2;
const STATE_CONNECTED = 3;
const STATE_DISCONNECTING = 4;
const STATE_DISCONNECTED = 5;

const Guacd = () => {

    let [searchParams] = useSearchParams();
    let assetId = searchParams.get('assetId');
    let assetName = searchParams.get('assetName');
    let protocol = searchParams.get('protocol');
    let width = searchParams.get('width');
    let height = searchParams.get('height');

    if (width && height) {
        fixedSize = true;
    } else {
        width = window.innerWidth;
        height = window.innerHeight;
    }

    let [box, setBox] = useState({width, height});
    let [guacd, setGuacd] = useState({});
    let [session, setSession] = useState({});
    let [clipboardText, setClipboardText] = useState('');
    let [fullScreened, setFullScreened] = useState(false);
    let [clipboardVisible, setClipboardVisible] = useState(false);
    let [fileSystemVisible, setFileSystemVisible] = useState(false);

    useEffect(() => {
        document.title = assetName;
        createSession();
    }, [assetId, assetName]);

    const createSession = async () => {
        let session = await sessionApi.create(assetId, 'guacd');
        if (!strings.hasText(session['id'])) {
            return;
        }
        setSession(session);
        renderDisplay(session['id'], protocol, width, height);
    }

    const renderDisplay = (sessionId, protocol, width, height) => {
        let tunnel = new Guacamole.WebSocketTunnel(`${wsServer}/sessions/${sessionId}/tunnel`);
        let client = new Guacamole.Client(tunnel);

        // 处理从虚拟机收到的剪贴板内容
        client.onclipboard = handleClipboardReceived;

        // 处理客户端的状态变化事件
        client.onstatechange = (state) => {
            onClientStateChange(state, sessionId);
        };

        client.onerror = onError;
        tunnel.onerror = onError;

        // Get display div from document
        const displayEle = document.getElementById("display");

        // Add client to display div
        const element = client.getDisplay().getElement();
        displayEle.appendChild(element);

        let dpi = 96;
        if (protocol === 'telnet') {
            dpi = dpi * 2;
        }

        let token = getToken();

        let params = {
            'width': width,
            'height': height,
            'dpi': dpi,
            'X-Auth-Token': token
        };

        let paramStr = qs.stringify(params);

        client.connect(paramStr);
        let display = client.getDisplay();
        display.onresize = function (width, height) {
            display.scale(Math.min(
                window.innerHeight / display.getHeight(),
                window.innerWidth / display.getHeight()
            ))
        }

        const sink = new Guacamole.InputSink();
        displayEle.appendChild(sink.getElement());
        sink.focus();

        const keyboard = new Guacamole.Keyboard(sink.getElement());

        keyboard.onkeydown = (keysym) => {
            console.log('aaa')
            client.sendKeyEvent(1, keysym);
            if (keysym === 65288) {
                return false;
            }
        };
        keyboard.onkeyup = (keysym) => {
            client.sendKeyEvent(0, keysym);
        };

        const sinkFocus = debounce(() => {
            sink.focus();
        });

        const mouse = new Guacamole.Mouse(element);

        mouse.onmousedown = mouse.onmouseup = function (mouseState) {
            sinkFocus();
            client.sendMouseState(mouseState);
        }

        mouse.onmousemove = function (mouseState) {
            sinkFocus();
            client.getDisplay().showCursor(false);
            mouseState.x = mouseState.x / display.getScale();
            mouseState.y = mouseState.y / display.getScale();
            client.sendMouseState(mouseState);
        };

        const touch = new Guacamole.Mouse.Touchpad(element); // or Guacamole.Touchscreen

        touch.onmousedown = touch.onmousemove = touch.onmouseup = function (state) {
            client.sendMouseState(state);
        };



        setGuacd({
            client,
            sink,
        });
    }

    useEffect(() => {
        let resize = debounce(() => {
            onWindowResize();
        });
        window.addEventListener('resize', resize);
        window.addEventListener('beforeunload', handleUnload);
        window.addEventListener('focus', handleWindowFocus);

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('beforeunload', handleUnload);
            window.removeEventListener('focus', handleWindowFocus);
        };
    }, [guacd])

    const onWindowResize = () => {
        if (guacd.client && !fixedSize) {
            const display = guacd.client.getDisplay();
            let width = window.innerWidth;
            let height = window.innerHeight;
            setBox({width, height});
            let scale = Math.min(
                height / display.getHeight(),
                width / display.getHeight()
            );
            display.scale(scale);
            guacd.client.sendSize(width, height);
        }
    }

    const handleUnload = (e) => {
        const message = "要离开网站吗？";
        (e || window.event).returnValue = message; //Gecko + IE
        return message;
    }

    const focus = () => {
        console.log(guacd.sink)
        if (guacd.sink) {
            guacd.sink.focus();
        }
    }

    const handleWindowFocus = (e) => {
        if (navigator.clipboard) {
            try {
                navigator.clipboard.readText().then((text) => {
                    sendClipboard({
                        'data': text,
                        'type': 'text/plain'
                    });
                })
            } catch (e) {
                console.error('复制剪贴板失败', e);
            }
        }
    };

    const handleClipboardReceived = (stream, mimetype) => {
        if (session['copy'] === '0') {
            // message.warn('禁止复制');
            return
        }

        if (/^text\//.exec(mimetype)) {
            let reader = new Guacamole.StringReader(stream);
            let data = '';
            reader.ontext = function textReceived(text) {
                data += text;
            };
            reader.onend = async () => {
                setClipboardText(data);
                if (navigator.clipboard) {
                    await navigator.clipboard.writeText(data);
                }
                // message.success('您选择的内容已复制到您的粘贴板中，在右侧的输入框中可同时查看到。');
            };
        } else {
            let reader = new Guacamole.BlobReader(stream, mimetype);
            reader.onend = () => {
                setClipboardText(reader.getBlob());
            }
        }
    };

    const sendClipboard = (data) => {
        if (!guacd.client) {
            return;
        }
        if (session['paste'] === '0') {
            message.warn('禁止粘贴');
            return
        }
        const stream = guacd.client.createClipboardStream(data.type);
        if (typeof data.data === 'string') {
            let writer = new Guacamole.StringWriter(stream);
            writer.sendText(data.data);
            writer.sendEnd();
        } else {
            let writer = new Guacamole.BlobWriter(stream);
            writer.oncomplete = function clipboardSent() {
                writer.sendEnd();
            };
            writer.sendBlob(data.data);
        }

        if (data.data && data.data.length > 0) {
            // message.info('您输入的内容已复制到远程服务器上');
        }
    }

    const onClientStateChange = (state, sessionId) => {
        const key = 'message';
        switch (state) {
            case STATE_IDLE:
                message.destroy(key);
                message.loading({content: '正在初始化中...', duration: 0, key: key});
                break;
            case STATE_CONNECTING:
                message.destroy(key);
                message.loading({content: '正在努力连接中...', duration: 0, key: key});
                break;
            case STATE_WAITING:
                message.destroy(key);
                message.loading({content: '正在等待服务器响应...', duration: 0, key: key});
                break;
            case STATE_CONNECTED:
                Modal.destroyAll();
                message.destroy(key);
                message.success({content: '连接成功', duration: 3, key: key});
                // 向后台发送请求，更新会话的状态
                sessionApi.connect(sessionId);
                break;
            case STATE_DISCONNECTING:

                break;
            case STATE_DISCONNECTED:
                message.info({content: '连接已关闭', duration: 3, key: key});
                break;
            default:
                break;
        }
    };

    const sendCombinationKey = (keys) => {
        if (!guacd.client) {
            return;
        }
        for (let i = 0; i < keys.length; i++) {
            guacd.client.sendKeyEvent(1, keys[i]);
        }
        for (let j = 0; j < keys.length; j++) {
            guacd.client.sendKeyEvent(0, keys[j]);
        }
        message.success('发送组合键成功');
    }

    const showMessage = (msg) => {
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

    const onError = (status) => {
        switch (status.code) {
            case 256:
                showMessage('未支持的访问');
                break;
            case 512:
                showMessage('远程服务异常，请检查目标设备能否正常访问。');
                break;
            case 513:
                showMessage('服务器忙碌');
                break;
            case 514:
                showMessage('服务器连接超时');
                break;
            case 515:
                showMessage('远程服务异常');
                break;
            case 516:
                showMessage('资源未找到');
                break;
            case 517:
                showMessage('资源冲突');
                break;
            case 518:
                showMessage('资源已关闭');
                break;
            case 519:
                showMessage('远程服务未找到');
                break;
            case 520:
                showMessage('远程服务不可用');
                break;
            case 521:
                showMessage('会话冲突');
                break;
            case 522:
                showMessage('会话连接超时');
                break;
            case 523:
                showMessage('会话已关闭');
                break;
            case 768:
                showMessage('网络不可达');
                break;
            case 769:
                showMessage('服务器密码验证失败');
                break;
            case 771:
                showMessage('客户端被禁止');
                break;
            case 776:
                showMessage('客户端连接超时');
                break;
            case 781:
                showMessage('客户端异常');
                break;
            case 783:
                showMessage('错误的请求类型');
                break;
            case 800:
                showMessage('会话不存在');
                break;
            case 801:
                showMessage('创建隧道失败，请检查Guacd服务是否正常。');
                break;
            case 802:
                showMessage('管理员强制关闭了此会话');
                break;
            default:
                if (status.message) {
                    // guacd 无法处理中文字符，所以进行了base64编码。
                    showMessage(Base64.decode(status.message));
                } else {
                    showMessage('未知错误。');
                }

        }
    };

    const fullScreen = () => {
        if (fullScreened) {
            exitFull();
            setFullScreened(false);
        } else {
            requestFullScreen(document.documentElement);
            setFullScreened(true);
        }
        focus();
    }

    const hotKeyMenu = (
        <Menu>
            <Menu.Item key={'ctrl+alt+delete'}
                       onClick={() => sendCombinationKey(['65507', '65513', '65535'])}>Ctrl+Alt+Delete</Menu.Item>
            <Menu.Item key={'ctrl+alt+backspace'}
                       onClick={() => sendCombinationKey(['65507', '65513', '65288'])}>Ctrl+Alt+Backspace</Menu.Item>
            <Menu.Item key={'windows+d'}
                       onClick={() => sendCombinationKey(['65515', '100'])}>Windows+D</Menu.Item>
            <Menu.Item key={'windows+e'}
                       onClick={() => sendCombinationKey(['65515', '101'])}>Windows+E</Menu.Item>
            <Menu.Item key={'windows+r'}
                       onClick={() => sendCombinationKey(['65515', '114'])}>Windows+R</Menu.Item>
            <Menu.Item key={'windows+x'}
                       onClick={() => sendCombinationKey(['65515', '120'])}>Windows+X</Menu.Item>
            <Menu.Item key={'windows'}
                       onClick={() => sendCombinationKey(['65515'])}>Windows</Menu.Item>
        </Menu>
    );

    return (
        <div>
            <div className="container" style={{
                width: box.width,
                height: box.height,
                margin: '0 auto',
                backgroundColor: '#1b1b1b'
            }}>
                <div id="display"/>
            </div>

            <Draggable>
                <Affix style={{position: 'absolute', top: 50, right: 50}}>
                    <Button icon={<ExpandOutlined/>} onClick={() => {
                        fullScreen();
                    }}/>
                </Affix>
            </Draggable>

            {
                session['copy'] === '1' || session['paste'] === '1' ?
                    <Draggable>
                        <Affix style={{position: 'absolute', top: 50, right: 100}}>
                            <Button icon={<CopyOutlined/>}
                                    onClick={() => {
                                        setClipboardVisible(true);
                                    }}/>
                        </Affix>
                    </Draggable> : undefined
            }


            {
                protocol === 'vnc' &&
                <Draggable>
                    <Affix style={{position: 'absolute', top: 100, right: 100}}>
                        <Dropdown overlay={hotKeyMenu} trigger={['click']} placement="bottomLeft">
                            <Button icon={<WindowsOutlined/>}/>
                        </Dropdown>
                    </Affix>
                </Draggable>
            }

            {
                (protocol === 'rdp' && session['fileSystem'] === '1') &&
                <Draggable>
                    <Affix style={{position: 'absolute', top: 100, right: 50}}>
                        <Button icon={<FolderOutlined/>} onClick={() => {
                            setFileSystemVisible(true);
                        }}/>
                    </Affix>
                </Draggable>
            }

            {
                protocol === 'rdp' &&
                <Draggable>
                    <Affix style={{position: 'absolute', top: 100, right: 100}}>
                        <Dropdown overlay={hotKeyMenu} trigger={['click']} placement="bottomLeft">
                            <Button icon={<WindowsOutlined/>}/>
                        </Dropdown>
                    </Affix>
                </Draggable>
            }

            <Drawer
                title={'文件管理'}
                placement="right"
                width={window.innerWidth * 0.8}
                closable={true}
                onClose={() => {
                    focus();
                    setFileSystemVisible(false);
                }}
                visible={fileSystemVisible}
            >
                <FileSystem
                    storageId={session['id']}
                    storageType={'sessions'}
                    upload={session['upload'] === '1'}
                    download={session['download'] === '1'}
                    delete={session['delete'] === '1'}
                    rename={session['rename'] === '1'}
                    edit={session['edit'] === '1'}
                    minHeight={window.innerHeight - 103}/>
            </Drawer>

            <GuacdClipboard
                visible={clipboardVisible}
                clipboardText={clipboardText}
                handleOk={(text) => {
                    sendClipboard({
                        'data': text,
                        'type': 'text/plain'
                    });
                    setClipboardText(text);
                    setClipboardVisible(false);
                    focus();
                }}
                handleCancel={() => {
                    setClipboardVisible(false);
                    focus();
                }}
            />
        </div>
    );
};

export default Guacd;