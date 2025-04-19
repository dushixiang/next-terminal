import React, {useEffect} from 'react';
import {useSearchParams} from "react-router-dom";
import {maybe} from "@/src/utils/maybe";
import {Terminal} from "@xterm/xterm";
import {FitAddon} from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import {baseWebSocketUrl, getToken} from "@/src/api/core/requests";
import qs from "qs";
import strings from "@/src/utils/strings";
import {Message, MessageTypeData, MessageTypeExit, MessageTypeJoin} from "@/src/pages/access/Terminal";

const TerminalMonitor = () => {

    const [searchParams, setSearchParams] = useSearchParams();
    let sessionId = maybe(searchParams.get('sessionId'), '');
    let token = maybe(searchParams.get('token'), '');

    const writeErrorMessage = (term: Terminal, message: string) => {
        term.writeln(`\x1B[1;3;31m${message}\x1B[0m `);
    }

    const init = (term: Terminal, sessionId: string) => {
        let elementTerm = document.getElementById('terminal');
        if (!elementTerm) {
            return
        }
        term.open(elementTerm);
        let fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        fitAddon.fit();
        term.focus();

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
            'sessionId': sessionId,
        };

        let paramStr = qs.stringify(params);

        let websocket = new WebSocket(`${baseWebSocketUrl()}/admin/sessions/${sessionId}/terminal-monitor?${paramStr}`);
        websocket.onopen = (e => {
            term.clear();
        });

        websocket.onerror = (e) => {
            writeErrorMessage(term, `websocket error`);
        }

        websocket.onclose = (e) => {
            writeErrorMessage(term, `connection is closed.`);
        }

        websocket.onmessage = (e) => {
            let msg = Message.parse(e.data);
            switch (msg.type) {
                case MessageTypeData:
                    term.write(msg.content);
                    break;
            }
        }
        return websocket;
    }

    useEffect(() => {
        let term = new Terminal({
            fontFamily: 'monaco, Consolas, "Lucida Console", monospace',
            fontSize: 15,
            theme: {
                background: '#141414'
            },
        });

        let websocket = init(term, sessionId);

        return () => {
            term.dispose();
            if (websocket) {
                websocket.close(3886, 'client quit');
            }
        }

    }, []);

    return (
        <div id='terminal'
             style={{
                 overflow: 'hidden',
                 padding: 8,
                 backgroundColor: '#141414',
             }}
             className={'h-screen w-screen'}
        />
    );
};

export default TerminalMonitor;