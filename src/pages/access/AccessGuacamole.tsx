import React, {useEffect, useRef, useState} from 'react';
import {baseWebSocketUrl, getToken} from "@/src/api/core/requests";
import qs from "qs";
// @ts-ignore
import Guacamole from '@dushixiang/guacamole-common-js';
import {useTranslation} from "react-i18next";
import {useWindowSize} from "react-use";
import portalApi, {ExportSession} from "@/src/api/portal-api";
import {HashLoader} from "react-spinners";
import {useAccessContentSize} from "@/src/hook/use-access-size";
import {useAccessTab} from "@/src/hook/use-access-tab";
import FileSystemPage from "@/src/pages/access/FileSystemPage";
import SessionSharerModal from "@/src/pages/access/SessionSharerModal";
import GuacClipboard from "@/src/pages/access/GuacClipboard";
import GuacdRequiredParameters from "@/src/pages/access/GuacdRequiredParameters";
import {useMutation} from "@tanstack/react-query";
import {Dropdown, FloatButton, message, Watermark} from "antd";
import {
    CopyOutlined,
    ExpandOutlined,
    FolderOutlined,
    ShareAltOutlined,
    ToolOutlined,
    WindowsOutlined
} from "@ant-design/icons";
import copy from "copy-to-clipboard";
import useWindowFocus from "@/src/hook/use-window-focus";
import {isFullScreen, requestFullScreen} from "@/src/utils/utils";
import Timeout, {TimeoutHandle} from "@/src/components/Timeout";
import {debounce} from "@/src/utils/debounce";
import MultiFactorAuthentication from "@/src/pages/account/MultiFactorAuthentication";

interface Props {
    assetId: string;
}

const AccessGuacamole = ({assetId}: Props) => {

    let [requiredOpen, setRequiredOpen] = useState<boolean>(false);
    let [requiredParameters, setRequiredParameters] = useState<string[]>();

    let {t} = useTranslation();

    let [tiger, setTiger] = useState(new Date().toString());
    const terminalRef = React.useRef<HTMLDivElement>();
    const containerRef = React.useRef<HTMLDivElement>();
    let [client, setClient] = useState<Guacamole.Client>();
    let [sink, setSink] = useState<Guacamole.InputSink>();
    let [state, setState] = useState<Guacamole.Client.State>();
    let [status, setStatus] = useState<Guacamole.Status>();

    let [session, setSession] = useState<ExportSession>();
    let [sharerOpen, setSharerOpen] = useState(false);
    let [fileSystemOpen, setFileSystemOpen] = useState(false);
    let [preFileSystemOpen, setPreFileSystemOpen] = useState(false);

    let [clipboardText, setClipboardText] = useState('');
    let [clipboardVisible, setClipboardVisible] = useState(false);
    let [floatButtonOpen, setFloatButtonOpen] = useState(false);

    let {width, height} = useWindowSize();
    let [contentSize] = useAccessContentSize();
    let [accessTab] = useAccessTab();
    let [active, setActive] = useState(true);
    let [fixedSize, setFixedSize] = useState(false);
    let [displaySize, setDisplaySize] = useState([0, 0]);
    let [mfaOpen, setMfaOpen] = useState(false);

    const timeoutRef = useRef<TimeoutHandle>();

    const resetTimer = () => {
        timeoutRef.current?.reset();
        console.log(`reset timer`, timeoutRef.current);
    }

    let windowFocus = useWindowFocus();

    useEffect(() => {
        let current = accessTab.split('_')[1];
        setActive(current === assetId)
    }, [accessTab]);

    useEffect(() => {

        const handleKeyDown = (event) => {
            if (event.ctrlKey) {
                event.preventDefault(); // 阻止默认行为
            }
            if (event.metaKey) {
                event.preventDefault(); // 阻止默认行为
            }
        }
        if (active === true) {
            sink?.focus();
            fitFit();
            setFileSystemOpen(preFileSystemOpen);
            document.addEventListener("keydown", handleKeyDown);
            return () => {
                document.removeEventListener("keydown", handleKeyDown);
            }
        } else {
            setFileSystemOpen(false);
        }
    }, [active]);

    useEffect(() => {
        if (windowFocus === true && active === true) {
            handleWindowFocus();
        }
    }, [active, windowFocus]);

    let sendRequiredMutation = useMutation({
        mutationFn: (values: any) => {
            return new Promise<void>((resolve, reject) => {
                console.log(`send args to server`, values)
                for (let name in values) {
                    let value = values[name];
                    if (!value) {
                        value = '';
                    }
                    const stream = client?.createArgumentValueStream("text/plain", name);
                    const writer = new Guacamole.StringWriter(stream);
                    writer.sendText(value);
                    writer.sendEnd();
                    resolve();
                }
            });
        },
        onSuccess: () => {
            setRequiredOpen(false);
        }
    });

    useEffect(() => {
        fitFit()
    }, [client, width, height, contentSize]);

    const fitFit = debounce(() => {
        let container = getContainerSize();
        if (active === false || container.width === 0 || container.height === 0) {
            return
        }
        // const pixelDensity = window.devicePixelRatio || 1;
        let w = container.width;
        let h = container.height;
        let display = client?.getDisplay();
        let dw = display?.getWidth();
        let dh = display?.getHeight();
        if (dw !== w || dh !== h) {
            if (!fixedSize) {
                // 向服务端发送窗口大小
                client?.sendSize(w, h);
                // console.log(`send size`, "container", w, h, "display", dw, dh)
            }
            display?.onresize(w, h);
        }
    }, 500)

    useEffect(() => {
        let container = getContainerSize();
        let w = container.width;
        let h = container.height;
        let display = client?.getDisplay();
        let dw = display?.getWidth();
        let dh = display?.getHeight();
        let scale = 1;
        if (dw && dw != 0 && dh && dh != 0) {
            scale = Math.min(
                w / dw,
                h / dh,
            );
        }
        // console.log(`resize`, "container", w, h, "display", dw, dh, "scale", scale);
        client?.getDisplay().scale(scale);
    }, [client, displaySize])

    const getContainerSize = () => {
        if (isFullScreen()) {
            return {
                width: window.innerWidth,
                height: window.innerHeight,
            }
        }
        return {
            width: containerRef.current?.offsetWidth,
            height: containerRef.current?.offsetHeight,
        }
    }

    const handleClipboardReceived = (stream: Guacamole.InputStream, mimetype: any) => {
        if (/^text\//.exec(mimetype)) {
            console.log(`1`)
            let reader = new Guacamole.StringReader(stream);
            let data = '';
            reader.ontext = function textReceived(text: string) {
                data += text;
            };
            reader.onend = async () => {
                setClipboardText(data);
                copy(data);
                message.success(t('copy_success'));
            };
            console.log(`0`)
        } else {
            let reader = new Guacamole.BlobReader(stream, mimetype);
            reader.onend = () => {
                reader.getBlob().text().then(text => {
                    setClipboardText(text);
                    copy(text);
                })
            }
        }
    };

    const handleWindowFocus = () => {
        if (navigator.clipboard) {
            try {
                navigator.clipboard.readText().then((text) => {
                    sendClipboard({
                        'data': text,
                        'type': 'text/plain'
                    });
                })
            } catch (e) {
                console.error('read clipboard err', e);
            }
        }
    };

    const connect = async (securityToken?: string) => {
        let session: ExportSession;
        try {
            session = await portalApi.createSessionByAssetsId(assetId, securityToken);
            setSession(session);
        } catch (e) {
            return
        }

        let tunnel = new Guacamole.WebSocketTunnel(`${baseWebSocketUrl()}/access/graphics`);
        let client = new Guacamole.Client(tunnel);

        // 处理客户端的状态变化事件
        client.onstatechange = (state: Guacamole.Client.State) => {
            setState(state);
        };
        client.onerror = (status: Guacamole.Status) => {
            setStatus(status);
        }

        client.onrequired = function (parameters) {
            setRequiredParameters([...parameters]);
            setRequiredOpen(true);
        }
        // 处理从虚拟机收到的剪贴板内容
        client.onclipboard = (stream: Guacamole.InputStream, mimetype: any) => {
            if (!session?.strategy?.copy) {
                message.info(t('copy-disabled'))
                return
            }
            handleClipboardReceived(stream, mimetype)
        };

        const displayEle = terminalRef.current;
        while (displayEle?.firstChild) {
            displayEle.removeChild(displayEle.firstChild);
        }
        const element = client.getDisplay().getElement();
        displayEle?.appendChild(element);

        let display = client.getDisplay();
        display.onresize = function (w: number, h: number) {
            setDisplaySize([w, h]);
        }

        const sink = new Guacamole.InputSink();
        element.appendChild(sink.getElement());

        const keyboard = new Guacamole.Keyboard(sink.getElement());
        sink.getElement().addEventListener("keypress", function (e) {
            e.preventDefault();
        })
        keyboard.onkeydown = (keysym: number) => {
            // console.log('keydown', keysym, accessTab, keyboard, JSON.stringify(keyboard.pressed))
            client.sendKeyEvent(1, keysym);
            if (keysym === 65288) {
                return false;
            }
            resetTimer();
            return true;
        };
        keyboard.onkeyup = (keysym: number) => {
            // console.log('keyup', keysym, accessTab)
            client.sendKeyEvent(0, keysym);
        };

        const mouse = new Guacamole.Mouse(element);

        // @ts-ignore
        mouse.onmousedown = mouse.onmouseup = function (mouseState) {
            client.sendMouseState(mouseState);
            sink.focus();
            resetTimer();
        }

        // @ts-ignore
        mouse.onmousemove = function (mouseState) {
            mouseState.x = mouseState.x / display.getScale();
            mouseState.y = mouseState.y / display.getScale();
            client.sendMouseState(mouseState);
        };

        mouse.on('mouseout', function hideCursor() {
            client.getDisplay().showCursor(false);
        });
        display.showCursor(false);
        display.oncursor = (canvas, x, y) => {
            mouse.setCursor(canvas, x, y);
        }

        const touch = new Guacamole.Mouse.Touchpad(element); // or Guacamole.Touchscreen
        // @ts-ignore
        touch.onmousedown = touch.onmousemove = touch.onmouseup = function (state: any) {
            client.sendMouseState(state);
            resetTimer();
        };

        let authToken = getToken();
        let dpi = 96 * 2;
        let {width, height} = getContainerSize();
        let params = {
            'width': width,
            'height': height,
            'dpi': dpi,
            'sessionId': session.id,
            'X-Auth-Token': authToken
        };
        if (session.width > 0 && session.height > 0) {
            params['width'] = session.width;
            params['height'] = session.height;
            setFixedSize(true);
        }

        let paramStr = qs.stringify(params);
        client.connect(paramStr);

        setClient(client);
        setSink(sink);
    }

    const connectWrap = async () => {
        let required = await portalApi.getAccessRequireMFA();
        if (required) {
            setMfaOpen(true);
        } else {
            connect();
        }
    }

    useEffect(() => {
        connectWrap();
        return () => {
            client?.disconnect();
            console.log(`client disconnect`)
        }
    }, [tiger]);

    function renderState(state: Guacamole.Client.State, status: Guacamole.Status) {
        let loading = true;
        let error = false;
        let stateText = '';
        switch (state) {
            case Guacamole.Client.State.IDLE:
                stateText = t('guacamole.state.idle');
                break;
            case Guacamole.Client.State.CONNECTING:
                stateText = t('guacamole.state.connecting');
                break;
            case Guacamole.Client.State.WAITING:
                stateText = t('guacamole.state.waiting')
                break;
            case Guacamole.Client.State.CONNECTED:
                return undefined;
            case Guacamole.Client.State.DISCONNECTING:
                error = true;
                break;
            case Guacamole.Client.State.DISCONNECTED:
                stateText = t('guacamole.state.disconnected');
                loading = false;
                error = true;
                break;
            default:
                break;
        }
        return <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4">
                {loading && (
                    <div className="flex flex-col gap-4 p-4 text-center items-center justify-center">
                        <HashLoader color="#1568DB" />
                        <div>{stateText}</div>
                    </div>
                )}
                {error && (
                    <div className="flex flex-col gap-2 text-red-400 bg-gray-800/90 border border-red-500 rounded-lg p-6 min-w-[400px] shadow-lg">
                        <div className="flex items-center gap-2 text-lg font-bold">
                            <span className="text-red-500">❌</span>
                            <span>Error</span>
                        </div>
                        {status?.code && <div className="text-sm opacity-80">Code: {status?.code}</div>}
                        {status?.message && <div className="text-sm opacity-80">Message: {status?.message}</div>}
                        {stateText && <div className="font-bold text-base mb-4">State: {stateText}</div>}
                        <button
                            className="bg-blue-500 text-white text-center hover:bg-blue-600 transition-all duration-300 px-3 py-2 rounded-lg cursor-pointer"
                            onClick={() => {
                                setTiger(new Date().toString());
                                setState(Guacamole.Client.State.IDLE);
                                setStatus(undefined);
                                resetTimer();
                            }}
                        >
                            {t('access.reconnect')}
                        </button>
                    </div>
                )}
            </div>
        </div>;
    }

    const sendClipboard = (data: any) => {
        if (!client) {
            return;
        }
        const stream = client?.createClipboardStream(data.type);
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

        // if (data.data && data.data.length > 0) {
        //     message.success('您输入的内容已复制到远程服务器上');
        // }
    }

    const menuItems = [
        {
            key: '65507+65513+65535',
            label: 'Ctrl+Alt+Delete'
        },
        {
            key: '65507+65513+65228',
            label: 'Ctrl+Alt+Backspace'
        },
        {
            key: '65515+100',
            label: 'Window+D'
        },
        {
            key: '65515+101',
            label: 'Window+E'
        },
        {
            key: '65515+114',
            label: 'Window+R'
        },
        {
            key: '65515+120',
            label: 'Window+X'
        },
        {
            key: '65515',
            label: 'Window'
        },
    ];

    const handleMenuClick = (e: any) => {
        sendCombinationKey(e.key.split('+'));
    }

    const sendCombinationKey = (keys: string[]) => {
        for (let i = 0; i < keys.length; i++) {
            client?.sendKeyEvent(1, Number(keys[i]));
        }
        for (let j = 0; j < keys.length; j++) {
            client?.sendKeyEvent(0, Number(keys[j]));
        }
    }

    const fullScreen = () => {
        requestFullScreen(terminalRef.current);
        sink?.focus();
    }

    return (
        <div className={'w-full'}
             style={{
                 height: height - 77.5,
             }}
             ref={containerRef}
        >
            {renderState(state, status)}
            <div className={'flex items-center justify-center h-full w-full'}>
                <Watermark content={session?.watermark?.content}
                           font={{
                               color: session?.watermark?.color,
                               fontSize: session?.watermark?.size
                           }}
                           className={'w-full'}
                >
                    <div className={'w-full flex items-center justify-center'}
                         ref={terminalRef}
                    />
                </Watermark>
            </div>

            <FloatButton.Group shape="circle"
                               open={floatButtonOpen}
                               trigger="click"
                               onClick={() => {
                                   setFloatButtonOpen(!floatButtonOpen)
                               }}
                               icon={<ToolOutlined/>}
            >
                {session?.fileSystem ?
                    <FloatButton icon={<FolderOutlined/>} tooltip={t('access.filesystem')}
                                 onClick={() => {
                                     setFileSystemOpen(true);
                                     setPreFileSystemOpen(true);
                                 }}/>
                    : undefined
                }

                <FloatButton icon={<ShareAltOutlined/>} tooltip={t('access.session.share.action')}
                             onClick={() => setSharerOpen(true)}/>
                <FloatButton icon={<CopyOutlined/>} tooltip={t('access.clipboard')}
                             onClick={() => setClipboardVisible(true)}/>
                <Dropdown
                    menu={{
                        items: menuItems,
                        onClick: handleMenuClick
                    }}
                    trigger={['click']}
                    placement="bottomLeft">
                    <FloatButton icon={<WindowsOutlined/>} tooltip={t('access.combination_key')}/>
                </Dropdown>
                <FloatButton icon={<ExpandOutlined/>} tooltip={t('access.toggle_full_screen')}
                             onClick={() => fullScreen()}/>
            </FloatButton.Group>


            <FileSystemPage fsId={session?.id}
                            strategy={session?.strategy}
                            open={fileSystemOpen}
                            mask={false}
                            maskClosable={false}
                            onClose={() => {
                                setFileSystemOpen(false);
                                setPreFileSystemOpen(false);
                            }}/>

            <SessionSharerModal sessionId={session?.id} open={sharerOpen}
                                onClose={() => setSharerOpen(false)}/>
            <GuacClipboard clipboardText={clipboardText}
                           open={clipboardVisible}
                           handleOk={(text) => {
                               sendClipboard({
                                   'data': text,
                                   'type': 'text/plain'
                               });
                               setClipboardText(text);
                               setClipboardVisible(false);
                               sink?.focus();
                           }}
                           handleCancel={() => {
                               setClipboardVisible(false);
                               sink?.focus();
                           }}
            />

            <GuacdRequiredParameters
                open={requiredOpen}
                parameters={requiredParameters}
                confirmLoading={sendRequiredMutation.isPending}
                handleOk={sendRequiredMutation.mutate}
                handleCancel={() => {
                    setRequiredOpen(false);
                    client?.disconnect();
                }}
            />

            <Timeout
                ref={timeoutRef}
                fn={() => {
                    client?.disconnect();
                    console.log(`client disconnect by timeout`, session?.idle)
                }}
                ms={session?.idle * 1000}
            />

            <MultiFactorAuthentication
                open={mfaOpen}
                handleOk={async (securityToken) => {
                    setMfaOpen(false);
                    connect(securityToken);
                }}
                handleCancel={() => setMfaOpen(false)}
            />
        </div>
    );
};

export default AccessGuacamole;