import React, {useEffect, useRef, useState} from 'react';
import {baseWebSocketUrl, getToken} from '@/api/core/requests';
import qs from "qs";
import {Terminal} from "@xterm/xterm";
import {FitAddon} from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import {useSearchParams} from "react-router-dom";
import {maybe} from "@/utils/maybe";
import portalApi, {ExportSession} from "@/api/portal-api";
import strings from "@/utils/strings";
import {Message, MessageTypeData, MessageTypeKeepAlive, MessageTypeResize} from './Terminal';
import {useInterval} from "react-use";

export interface TerminalProps {
    assetId?: string
    sessionId?: string
    sharer?: boolean
}

const TerminalPage = ({}: TerminalProps) => {

    const terminalRef = React.useRef<HTMLDivElement>();
    let websocket = useRef<WebSocket>();

    const [searchParams] = useSearchParams();
    let token = maybe(searchParams.get('token'), '');
    let sharer = maybe(searchParams.get('sharer'), false);
    let sessionId = searchParams.get('sessionId');

    let [title, setTitle] = useState('');

    useInterval(() => {
        websocket.current?.send(new Message(MessageTypeKeepAlive, "").toString());
    }, 5000);

    useEffect(() => {
        document.title = title;
    }, [title]);

    const writeErrorMessage = (term: Terminal, message: string) => {
        term.writeln(`\x1B[1;3;31m${message}\x1B[0m `);
    }

    const connect = (term: Terminal, {id, idle, assetName}: ExportSession) => {
        let elementTerm = terminalRef.current;
        if (!elementTerm) {
            return
        }
        setTitle(assetName);
        term.open(elementTerm);
        let fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        fitAddon.fit();
        term.focus();

        term.attachCustomKeyEventHandler((domEvent) => {
            if (domEvent.ctrlKey && domEvent.key === 'c' && term.hasSelection()) {
                return false;
            }
            return !(domEvent.ctrlKey && domEvent.key === 'v');
        })

        term.writeln('trying to connect to the server ...');
        let cols = term.cols;
        let rows = term.rows;
        let authToken = getToken();
        if (strings.hasText(token)) {
            authToken = token;
        }
        let params = {
            'cols': cols,
            'rows': rows,
            'X-Auth-Token': authToken,
            'sharer': sharer,
            'sessionId': id,
        };

        let paramStr = qs.stringify(params);
        websocket.current = new WebSocket(`${baseWebSocketUrl()}/access/terminal?${paramStr}`);
        websocket.current.onopen = (e => {
            term.clear();
            if (!sharer) {
                term.onResize(function (evt) {
                    websocket.current.send(new Message(MessageTypeResize, `${evt.cols},${evt.rows}`).toString());
                });
            }
            window.addEventListener("resize", () => {
                fitAddon && fitAddon.fit();
            });
        });

        websocket.current.onerror = (e) => {
            writeErrorMessage(term, `websocket error`);
        }

        websocket.current.onclose = (e) => {
            writeErrorMessage(term, `connection is closed.`);
        }

        term.onData(data => {
            websocket.current.send(new Message(MessageTypeData, data).toString());
        });

        websocket.current.onmessage = (e) => {
            let msg = Message.parse(e.data);
            switch (msg.type) {
                case MessageTypeData:
                    term.write(msg.content);
                    break;
            }
        }
        return websocket;
    }

    const handleUnload = (e: BeforeUnloadEvent) => {
        const message = "Leave?"; // 英文版的提示信息
        e.returnValue = message;
        return message;
    }

    useEffect(() => {
        if (websocket.current) return;

        let term = new Terminal({
            fontFamily: 'monaco, Consolas, "Lucida Console", monospace',
            fontSize: 15,
            theme: {
                background: '#141414'
            },
        });

        portalApi.getSessionById(sessionId)
            .then((session) => {
                connect(term, session);
            })
            .catch((e) => {
                writeErrorMessage(term, `get session err，${e?.message}`);
            })

        window.addEventListener('beforeunload', handleUnload);
        return () => {
            window.removeEventListener('beforeunload', handleUnload);
        }

    }, []);

    return (
        <div className={'overflow-hidden'}>
            <div ref={terminalRef}
                 className={'h-screen w-screen p-2 bg-[#141414]'}
            />
        </div>
    );
};

export default TerminalPage;