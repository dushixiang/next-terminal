import React, {useEffect, useRef, useState} from 'react';
import {baseWebSocketUrl, getToken} from "@/src/api/core/requests";
import qs from "qs";
// @ts-ignore
import Guacamole from '@dushixiang/guacamole-common-js';
import {useTranslation} from "react-i18next";
import {useWindowSize} from "react-use";
import portalApi, {ExportSession} from "@/src/api/portal-api";
import {useAccessContentSize} from "@/src/hook/use-access-size";
import {useAccessTab} from "@/src/hook/use-access-tab";
import FileSystemPage from "@/src/pages/access/FileSystemPage";
import SessionSharerModal from "@/src/pages/access/SessionSharerModal";
import GuacClipboard from "@/src/pages/access/GuacClipboard";
import GuacdRequiredParameters from "@/src/pages/access/GuacdRequiredParameters";
import {useMutation} from "@tanstack/react-query";
import {App, Watermark} from "antd";
import copy from "copy-to-clipboard";
import useWindowFocus from "@/src/hook/use-window-focus";
import {dropKeydown, isFullScreen, requestFullScreen} from "@/src/utils/utils";
import MultiFactorAuthentication from "@/src/pages/account/MultiFactorAuthentication";
import RenderState, {GuacamoleState} from "@/src/pages/access/guacamole/RenderState";
import ControlButtons from "@/src/pages/access/guacamole/ControlButtons";
import {GuacamoleStatus} from "@/src/pages/access/guacamole/ErrorAlert";
import {debounce} from "@/src/utils/debounce";
import {duplicateKeys} from "@/src/pages/access/guacamole/keys";

interface Props {
    assetId: string;
}

const AccessGuacamole = ({assetId}: Props) => {

    let [requiredOpen, setRequiredOpen] = useState<boolean>(false);
    let [requiredParameters, setRequiredParameters] = useState<string[]>();

    let {t} = useTranslation();
    let {message} = App.useApp();

    let [tiger, setTiger] = useState(0);
    const terminalRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    let clientRef = useRef<Guacamole.Client>(null);
    let sinkRef = useRef<Guacamole.InputSink>(null);
    let keyboardRef = useRef<Guacamole.Keyboard>(null);

    let [state, setState] = useState<number>();
    let [status, setStatus] = useState<GuacamoleStatus>();
    let [tunnelState, setTunnelState] = useState<number>();

    let [session, setSession] = useState<ExportSession>();
    const [modals, setModals] = useState({sharer: false, fs: false, clipboard: false, mfa: false});
    let [clipboardText, setClipboardText] = useState('');

    let {width, height} = useWindowSize();
    let [contentSize] = useAccessContentSize();
    let [accessTab] = useAccessTab();
    let [active, setActive] = useState(true);

    let [mfaOpen, setMfaOpen] = useState(false);
    let [fixedSize, setFixedSize] = useState(false);

    let windowFocus = useWindowFocus();

    // 判断当前 tab
    useEffect(() => {
        const current = accessTab.split('_')[1];
        setActive(current === assetId);
    }, [accessTab, assetId]);

    useEffect(() => {
        if (windowFocus && active) {
            handleWindowFocus(); // 你处理剪贴板的函数
            debouncedResize(); // 处理窗口大小变化
            sinkRef.current?.focus();     // 确保 Guacamole 输入区域获得焦点
            window.addEventListener('keydown', dropKeydown);
            return () => {
                window.removeEventListener('keydown', dropKeydown);
            }
        }

        if (!windowFocus || !active) {
            keyboardRef.current?.reset();
            console.log(`keyboard reset `)
        }
    }, [windowFocus, active]);

    let sendRequiredMutation = useMutation({
        mutationFn: (values: any) => {
            return new Promise<void>((resolve) => {
                for (const [name, raw] of Object.entries(values)) {
                    const value = raw ?? '';
                    const stream = clientRef.current?.createArgumentValueStream("text/plain", name);
                    if (stream) {
                        const writer = new Guacamole.StringWriter(stream);
                        writer.sendText(value);
                        writer.sendEnd();
                    }
                }
                resolve();
            });
        },
        onSuccess: () => setRequiredOpen(false)
    });

    // 集中处理 resize + scale
    const handleResize = () => {
        const container = getContainerSize();
        if (!active || container.width === 0 || container.height === 0) return;

        const display = clientRef.current?.getDisplay();
        const dw = display?.getWidth();
        const dh = display?.getHeight();

        const dpi = computeDPI();

        if (dw !== container.width * dpi || dh !== container.height * dpi) {
            if (!fixedSize) {
                clientRef.current?.sendSize(container.width * dpi, container.height * dpi);
            }
        }

        if (dw && dh) {
            const scale = Math.min(container.width / dw, container.height / dh);
            display.scale(scale);
        }
    };

    const computeDPI = () => {
        return 1;
        // return window.devicePixelRatio || 1;
    }

    const debouncedResize = debounce(handleResize, 250);

    useEffect(() => {
        debouncedResize();
    }, [width, height, contentSize]);

    const getContainerSize = () => (
        isFullScreen()
            ? {width: window.innerWidth, height: window.innerHeight}
            : {width: containerRef.current?.offsetWidth ?? 0, height: containerRef.current?.offsetHeight ?? 0}
    );

    const handleClipboardReceived = (stream: Guacamole.InputStream, mimetype: string) => {
        if (/^text\//.test(mimetype)) {
            const reader = new Guacamole.StringReader(stream);
            let data = '';
            reader.ontext = (text) => data += text;
            reader.onend = () => {
                setClipboardText(data);
                copy(data);
                message.success(t('general.copy_success'));
            };
        } else {
            const reader = new Guacamole.BlobReader(stream, mimetype);
            reader.onend = () => reader.getBlob().text().then(text => {
                setClipboardText(text);
                copy(text);
                message.success(t('general.copy_success'));
            });
        }
    };

    const handleWindowFocus = () => {
        if (navigator.clipboard) {
            navigator.clipboard.readText().then(text => {
                sendClipboard({data: text, type: 'text/plain'});
            }).catch(console.error);
        }
    };

    const connect = async (securityToken?: string) => {
        let session: ExportSession;
        try {
            session = await portalApi.createSessionByAssetsId(assetId, securityToken);
            setSession(session);
        } catch (e) {
            console.error('create session err', e);
            return
        }

        let tunnel = new Guacamole.WebSocketTunnel(`${baseWebSocketUrl()}/access/graphics`);
        let client = new Guacamole.Client(tunnel);

        tunnel.onstatechange = setTunnelState;
        client.onstatechange = setState;
        client.onerror = setStatus;

        client.onrequired = function (parameters) {
            setRequiredParameters([...parameters]);
            setRequiredOpen(true);
        }
        // 处理从虚拟机收到的剪贴板内容
        client.onclipboard = (stream: Guacamole.InputStream, mimetype: any) => {
            if (!session?.strategy?.copy) {
                message.info(t('general.clipboard_disabled'))
            } else {
                handleClipboardReceived(stream, mimetype)
            }
        };

        const displayEle = terminalRef.current;
        if (displayEle) {
            while (displayEle.firstChild) {
                displayEle.removeChild(displayEle.firstChild);
            }
        }
        const element = client.getDisplay().getElement();
        displayEle?.appendChild(element);

        let display = client.getDisplay();
        display.onresize = function (w: number, h: number) {
            debouncedResize();
        }

        const sink = new Guacamole.InputSink();
        let sinkElement = sink.getElement();
        // 修复粘贴问题
        sinkElement.addEventListener("paste", function (e) {
            // 阻止浏览器默认的按键拆分
            e.preventDefault();
        })
        element.appendChild(sinkElement);
        sinkRef.current = sink;

        const keyboard = new Guacamole.Keyboard(sinkElement);

        function shouldFilterRepeat(keysym: number): boolean {
            const twin = duplicateKeys.get(keysym);
            return twin !== undefined && keyboard.pressed[twin];
        }

        function handleKeyEvent(pressed: boolean, keysym: number): boolean {
            if (shouldFilterRepeat(keysym)) return false;

            // console.log(pressed ? 'keydown' : 'keyup', keysym, JSON.stringify(keyboard.pressed));
            client.sendKeyEvent(pressed ? 1 : 0, keysym);

            if (pressed && keysym === 65288) return false; // 65288 = Backspace

            return true;
        }

        keyboard.onkeydown = keysym => handleKeyEvent(true, keysym);
        keyboard.onkeyup = keysym => handleKeyEvent(false, keysym);

        keyboardRef.current = keyboard;

        const mouse = new Guacamole.Mouse(element);

        // @ts-ignore
        mouse.onmousedown = mouse.onmouseup = function (mouseState) {
            client.sendMouseState(mouseState);
            sink.focus();
        }

        // @ts-ignore
        mouse.onmousemove = function (mouseState) {
            mouseState.x = mouseState.x / display.getScale();
            mouseState.y = mouseState.y / display.getScale();
            client.sendMouseState(mouseState);
        };

        // mouse.on('mouseout', function hideCursor() {
        //     client.getDisplay().showCursor(false);
        // });
        // display.showCursor(false);
        // display.oncursor = (canvas, x, y) => {
        //     mouse.setCursor(canvas, x, y);
        // }

        const touch = new Guacamole.Mouse.Touchpad(element); // or Guacamole.Touchscreen
        // @ts-ignore
        touch.onmousedown = touch.onmousemove = touch.onmouseup = function (state: any) {
            client.sendMouseState(state);
        };


        let authToken = getToken();
        const dpi = computeDPI();
        let {width, height} = getContainerSize();
        let params = {
            'width': width * dpi,
            'height': height * dpi,
            'dpi': dpi * 96,
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

        clientRef.current = client;

        // console.log(`init client success`)
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
        if (!terminalRef.current) {
            return
        }
        // console.log(`client connect`);
        connectWrap();
        return () => {
            clientRef.current?.disconnect();
            // console.log(`client disconnect`);
        }
    }, [tiger]);

    const sendClipboard = (data: any) => {
        if (!clientRef.current) {
            return;
        }
        const stream = clientRef.current?.createClipboardStream(data.type);
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
    }

    const sendCombinationKey = (keys: string[]) => {
        for (let i = 0; i < keys.length; i++) {
            clientRef.current?.sendKeyEvent(1, Number(keys[i]));
        }
        for (let j = 0; j < keys.length; j++) {
            clientRef.current?.sendKeyEvent(0, Number(keys[j]));
        }
    }

    const fullScreen = () => {
        requestFullScreen(terminalRef.current);
        sinkRef.current?.focus();
    }

    return (
        <div className={'w-full'}
             style={{
                 height: height - 77.5,
             }}
             ref={containerRef}
        >
            <RenderState
                state={state}
                status={status}
                tunnelState={tunnelState}
                onReconnect={() => {
                    setStatus({});
                    setState(GuacamoleState.IDLE);
                    setTunnelState(Guacamole.Tunnel.State.CONNECTING);
                    setTiger(prevState => prevState + 1);
                }}
                overlay={true}
            />
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

            <ControlButtons
                sessionId={session?.id}
                hasFileSystem={session?.fileSystem}
                onOpenFS={() => {
                    setModals({
                        ...modals,
                        fs: true
                    })
                }}
                onShare={() => {
                    setModals({
                        ...modals,
                        sharer: true
                    })
                }}
                onClipboard={() => {
                    setModals({
                        ...modals,
                        clipboard: true
                    })
                }}
                onFull={() => {
                    fullScreen();
                }}
                onSendKeys={(keys) => {
                    sendCombinationKey(keys);
                }}
            />

            <FileSystemPage fsId={session?.id}
                            strategy={session?.strategy}
                            open={modals.fs}
                            mask={false}
                            maskClosable={false}
                            onClose={() => {
                                setModals({
                                    ...modals,
                                    fs: false
                                })
                            }}/>

            <SessionSharerModal sessionId={session?.id} open={modals.sharer}
                                onClose={() => setModals({...modals, sharer: false})}/>
            <GuacClipboard clipboardText={clipboardText}
                           open={modals.clipboard}
                           handleOk={(text) => {
                               sendClipboard({
                                   'data': text,
                                   'type': 'text/plain'
                               });
                               setClipboardText(text);
                               sinkRef.current?.focus();
                               setModals({
                                   ...modals,
                                   clipboard: false
                               })
                           }}
                           handleCancel={() => {
                               sinkRef.current?.focus();
                               setModals({
                                   ...modals,
                                   clipboard: false
                               })
                           }}
            />

            <GuacdRequiredParameters
                open={requiredOpen}
                parameters={requiredParameters}
                confirmLoading={sendRequiredMutation.isPending}
                handleOk={sendRequiredMutation.mutate}
                handleCancel={() => {
                    setRequiredOpen(false);
                    clientRef.current?.disconnect();
                }}
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