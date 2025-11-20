import React, {useEffect, useRef, useState} from 'react';
import {Terminal} from "@xterm/xterm";
import {CleanTheme, useTerminalTheme} from "@/hook/use-terminal-theme";
import {FitAddon} from "@xterm/addon-fit";
import {debounce} from "@/utils/debounce";
import {useAccessContentSize} from "@/hook/use-access-size";
import {useInterval, useWindowSize} from "react-use";
import {Message, MessageTypeData, MessageTypeKeepAlive, MessageTypeResize} from "@/pages/access/Terminal";
import portalApi, {ExportSession} from "@/api/portal-api";
import {baseWebSocketUrl, getToken} from "@/api/core/requests";
import qs from "qs";
import eventEmitter from "@/api/core/event-emitter";
import {clsx} from "clsx";

interface Props {
    assetId: string;
    securityToken?: string;
    tabId: string;
    onClose?: () => void;
}

const AccessTerminalBulkItem = React.memo(({assetId, securityToken, tabId, onClose}: Props) => {

    const terminalRef = React.useRef<HTMLDivElement>(null);
    const terminal = useRef<Terminal>(null);
    const fit = useRef<FitAddon>(null);

    let [websocket, setWebsocket] = useState<WebSocket>();
    let {width, height} = useWindowSize();
    let [contentSize] = useAccessContentSize();

    let [accessTheme] = useTerminalTheme();

    let [loading, setLoading] = useState(false);
    let [reconnected, setReconnected] = useState('');
    let [isFocus, setIsFocus] = useState(false);
    let [session, setSession] = useState<ExportSession>();

    useInterval(() => {
        if (websocket?.readyState === WebSocket.OPEN) {
            websocket?.send(new Message(MessageTypeKeepAlive, "").toString());
        }
    }, 5000);

    useEffect(() => {
        if (!fit.current) {
            return;
        }
        fitFit();
    }, [width, height, contentSize]);

    const fitFit = debounce(() => {
        fit.current?.fit();
    }, 500)

    useEffect(() => {
        // 2. 根据 tabId 构建唯一的事件名
        const eventName = `WS:MESSAGE:${tabId}`;

        const handleMessage = (message: string) => {
            // 检查 websocket 是否存在且已连接
            if (websocket?.readyState === WebSocket.OPEN) {
                websocket?.send(new Message(MessageTypeData, message + '\n').toString());
            }
        }
        eventEmitter.on(eventName, handleMessage);
        return () => {
            eventEmitter.off(eventName, handleMessage);
        }
    }, [websocket]);

    useEffect(() => {
        if (accessTheme && terminal.current) {
            let options = terminal.current?.options;
            if (options) {
                let cleanTheme = CleanTheme(accessTheme);
                options.theme = cleanTheme?.theme?.value;
                options.fontFamily = cleanTheme.fontFamily;
                options.fontSize = cleanTheme.fontSize;
                options.lineHeight = cleanTheme.lineHeight;
            }
        }
    }, [accessTheme]);

    useEffect(() => {
        let cleanTheme = CleanTheme(accessTheme);
        let term = new Terminal({
            theme: cleanTheme?.theme?.value,
            fontFamily: cleanTheme.fontFamily,
            fontSize: cleanTheme.fontSize,
            lineHeight: cleanTheme.lineHeight,
        });
        terminal.current = term;
        term.attachCustomKeyEventHandler((domEvent) => {
            if (domEvent.ctrlKey && domEvent.key === 'c' && term.hasSelection()) {
                return false;
            }
            return !(domEvent.ctrlKey && domEvent.key === 'v');
        })

        term.open(terminalRef.current);
        term.textarea.addEventListener('focus', () => {
            setIsFocus(true);
        });
        term.textarea.addEventListener('blur', () => {
            setIsFocus(false);
        })

        let fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        fitAddon.fit();
        term.focus();

        fit.current = fitAddon;

        return () => {
            term.dispose();
        }
    }, [])

    const connect = async (securityToken: string) => {
        if (loading === true) {
            return;
        }

        setLoading(true);

        let session: ExportSession;
        try {
            session = await portalApi.createSessionByAssetsId(assetId, securityToken);
            setSession(session);
        } catch (e) {
            terminal.current?.writeln(`\x1b[41m ERROR \x1b[0m : ${e.message}`);
            setLoading(false);
            return;
        }

        let cols = terminal.current?.cols;
        let rows = terminal.current?.rows;
        let authToken = getToken();
        let params = {
            'cols': cols,
            'rows': rows,
            'X-Auth-Token': authToken,
            'sessionId': session.id,
        };

        let paramStr = qs.stringify(params);
        let websocket = new WebSocket(`${baseWebSocketUrl()}/access/terminal?${paramStr}`);
        websocket.onopen = (e => {
            setLoading(false);
        });

        websocket.onerror = (e) => {
            terminal.current?.writeln(`websocket error`);
            setLoading(false);
        }

        websocket.onclose = (e) => {
            if (e.code === 3886) {
                terminal.current?.writeln('');
                terminal.current?.writeln('');
                terminal.current?.writeln(`\x1b[41m ${session.protocol.toUpperCase()} \x1b[0m ${session.assetName}: session timeout.`);
            } else {
                terminal.current?.writeln('');
                terminal.current?.writeln('');
                terminal.current?.writeln(`\x1b[41m ${session.protocol.toUpperCase()} \x1b[0m ${session.assetName}: session closed.`);
            }
            setLoading(false);
            terminal.current?.writeln('Press any key to reconnect');

            setWebsocket(null);
        }

        websocket.onmessage = (e) => {
            let msg = Message.parse(e.data);
            switch (msg.type) {
                case MessageTypeData:
                    terminal.current.write(msg.content);
                    break;
            }
        }
        setWebsocket(websocket);
    }

    useEffect(() => {
        if (!terminal.current) {
            return;
        }
        connect(securityToken)
    }, [reconnected]);

    useEffect(() => {
        let sizeListener = terminal.current?.onResize(function (evt) {
            // console.log(`term resize`, evt.cols, evt.rows);
            websocket?.send(new Message(MessageTypeResize, `${evt.cols},${evt.rows}`).toString());
        });
        let dataListener = terminal.current?.onData(data => {
            if (!websocket) {
                setReconnected(new Date().toString());
            } else {
                websocket?.send(new Message(MessageTypeData, data).toString());
            }
        });
        if (websocket) {
            terminal.current?.writeln('trying to connect to the server ...');
        }

        return () => {
            sizeListener?.dispose();
            dataListener?.dispose();
            websocket?.close();
        }
    }, [websocket]);

    return (
        <div className={clsx(
            'rounded border',
            isFocus && 'border-[#1063FF]',
        )}>
            <div className={'flex items-center justify-between px-2 py-1 border-b '}>
                <div className={'font-medium'}>
                    {session?.assetName}
                </div>
                {/*<XIcon className={'h-4 w-4 cursor-pointer'}*/}
                {/*       onClick={() => {*/}
                {/*           websocket?.close();*/}
                {/*           onClose?.();*/}
                {/*       }}*/}
                {/*/>*/}
            </div>
            <div ref={terminalRef}
                 className={'p-2 rounded-md'}
                 style={{
                     background: accessTheme?.theme?.value.background,
                 }}
            >

            </div>
        </div>
    );
});

export default AccessTerminalBulkItem;