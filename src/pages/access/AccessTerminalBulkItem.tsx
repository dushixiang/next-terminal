import React, {useEffect, useState} from 'react';
import {Terminal} from "@xterm/xterm";
import {CleanTheme, useTerminalTheme} from "@/src/hook/use-terminal-theme";
import {FitAddon} from "@xterm/addon-fit";
import {debounce} from "@/src/utils/debounce";
import {useAccessContentSize} from "@/src/hook/use-access-size";
import {useInterval, useWindowSize} from "react-use";
import {Message, MessageTypeData, MessageTypeKeepAlive, MessageTypeResize} from "@/src/pages/access/Terminal";
import portalApi, {ExportSession} from "@/src/api/portal-api";
import {baseWebSocketUrl, getToken} from "@/src/api/core/requests";
import qs from "qs";
import eventEmitter from "@/src/api/core/event-emitter";
import {clsx} from "clsx";

interface Props {
    assetId: string;
    securityToken?: string;
    onClose?: () => void;
}

const AccessTerminalBulkItem = React.memo(({assetId, securityToken, onClose}: Props) => {

    const terminalRef = React.useRef<HTMLDivElement>();

    let [terminal, setTerminal] = useState<Terminal>();
    let [fit, setFit] = useState<FitAddon>();
    let [websocket, setWebsocket] = useState<WebSocket>();
    let {width, height} = useWindowSize();
    let [contentSize] = useAccessContentSize();

    let [accessTheme] = useTerminalTheme();

    let [loading, setLoading] = useState(false);
    let [reconnected, setReconnected] = useState('');
    let [isFocus, setIsFocus] = useState(false);
    let [session, setSession] = useState<ExportSession>();

    useEffect(() => {
        fitFit();
    }, [width, height, contentSize]);

    const fitFit = debounce(() => {
        fit?.fit();
    }, 500)

    useEffect(() => {
        const a = (message: string) => {
            websocket?.send(new Message(MessageTypeData, message + '\n').toString());
        }
        eventEmitter.on("WS:MESSAGE", a);
        return () => {
            eventEmitter.off("WS:MESSAGE", a);
        }
    }, [websocket]);

    useEffect(() => {
        if (accessTheme && terminal) {
            let options = terminal.options;
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
        term.attachCustomKeyEventHandler((domEvent) => {
            if (domEvent.ctrlKey && domEvent.key === 'c' && term.hasSelection()) {
                return false;
            }
            return !(domEvent.ctrlKey && domEvent.key === 'v');
        })

        term.open(terminalRef.current);
        term.textarea.addEventListener('focus', () => {
            setIsFocus(true);
            console.log(`isFocus: ${isFocus}`, true);
        });
        term.textarea.addEventListener('blur', () => {
            setIsFocus(false);
            console.log(`isFocus: ${isFocus}`, false);
        })

        let fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        fitAddon.fit();
        term.focus();

        setFit(fitAddon);
        setTerminal(term);

        return () => {
            term.dispose();
            setTerminal(undefined);
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
            terminal?.writeln(`\x1b[41m ERROR \x1b[0m : ${e.message}`);
            return;
        }

        let cols = terminal.cols;
        let rows = terminal.rows;
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
            // console.error(`websocket error`, e);
            terminal?.writeln(`websocket error`);
        }

        websocket.onclose = (e) => {
            if (e.code === 3886) {
                terminal?.writeln('');
                terminal?.writeln('');
                terminal?.writeln(`\x1b[41m ${session.protocol.toUpperCase()} \x1b[0m ${session.assetName}: session timeout.`);
            } else {
                terminal?.writeln('');
                terminal?.writeln('');
                terminal?.writeln(`\x1b[41m ${session.protocol.toUpperCase()} \x1b[0m ${session.assetName}: session closed.`);
            }
            setLoading(false);
            terminal?.writeln('Press any key to reconnect');

            setWebsocket(null);
        }

        websocket.onmessage = (e) => {
            let msg = Message.parse(e.data);
            switch (msg.type) {
                case MessageTypeData:
                    terminal.write(msg.content);
                    break;
            }
        }
        setWebsocket(websocket);
    }

    useEffect(() => {
        if (!terminal) {
            return;
        }
        connect(securityToken)
    }, [terminal, reconnected]);

    useEffect(() => {
        let sizeListener = terminal?.onResize(function (evt) {
            // console.log(`term resize`, evt.cols, evt.rows);
            websocket?.send(new Message(MessageTypeResize, `${evt.cols},${evt.rows}`).toString());
        });
        let dataListener = terminal?.onData(data => {
            if (!websocket) {
                setReconnected(new Date().toString());
            } else {
                websocket?.send(new Message(MessageTypeData, data).toString());
            }
        });
        if (websocket) {
            terminal?.writeln('trying to connect to the server ...');
        }

        return () => {
            sizeListener?.dispose();
            dataListener?.dispose();
            websocket?.close();
        }
    }, [websocket]);

    useInterval(() => {
        websocket?.send(new Message(MessageTypeKeepAlive, "").toString());
    }, 5000);

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