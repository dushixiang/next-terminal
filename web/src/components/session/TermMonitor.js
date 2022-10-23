import React, {useEffect, useState} from 'react';
import {Terminal} from "xterm";
import {FitAddon} from "xterm-addon-fit";
import {getToken} from "../../utils/utils";
import {debounce} from "../../utils/fun";
import qs from "qs";
import {wsServer} from "../../common/env";
import Message from "../access/Message";
import {useSearchParams} from "react-router-dom";
import "xterm/css/xterm.css";

const TermMonitor = () => {

    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('sessionId');
    const [box, setBox] = useState({width: window.innerWidth, height: window.innerHeight});

    const onWindowResize = (fitAddon) => {
        if (fitAddon) {
            setBox(() => {
                return {width: window.innerWidth, height: window.innerHeight}
            })
            fitAddon.fit();
        }
    };

    const init = (sessionId) => {

        const term = new Terminal({
            fontFamily: 'monaco, Consolas, "Lucida Console", monospace',
            fontSize: 14,
            theme: {
                background: '#1b1b1b'
            },
        });

        term.open(document.getElementById('terminal'));
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        fitAddon.fit();
        term.focus();
        term.writeln("等待用户输入中...");

        term.onData(data => {

        });

        let token = getToken();
        let params = {
            'X-Auth-Token': token
        };

        let paramStr = qs.stringify(params);
        let waiting = true;

        let webSocket = new WebSocket(`${wsServer}/sessions/${sessionId}/ssh-monitor?${paramStr}`);
        webSocket.onmessage = (e) => {
            let msg = Message.parse(e.data);
            switch (msg['type']) {
                case Message.Connected:
                    term.clear();
                    break;
                case Message.Data:
                    if (waiting === true) {
                        waiting = false;
                        term.clear();
                    }
                    term.write(msg['content']);
                    break;
                case Message.Closed:
                    term.writeln(`\x1B[1;3;31m${msg['content']}\x1B[0m `)
                    webSocket.close();
                    break;
                default:
                    break;
            }
        }
        return [webSocket, fitAddon];
    }

    useEffect(() => {
        let [webSocket, fitAddon] = init(sessionId);
        let resize = debounce(() => {
            onWindowResize(fitAddon);
        });
        window.addEventListener('resize', resize);
        return () => {
            if (webSocket) {
                webSocket.close();
            }
            window.removeEventListener('resize', resize);
        }
    }, [sessionId]);

    return (
        <div id='terminal'
             style={{
                 width: box.width,
                 height: box.height,
                 backgroundColor: '#1b1b1b'
             }}/>
    );
};

export default TermMonitor;