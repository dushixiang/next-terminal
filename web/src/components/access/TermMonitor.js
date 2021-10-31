import React, {Component} from 'react';
import {Terminal} from "xterm";
import Message from "./Message";
import {getToken} from "../../utils/utils";
import qs from "qs";
import {wsServer} from "../../common/env";
import {FitAddon} from "xterm-addon-fit";

class TermMonitor extends Component {

    componentDidMount() {
        let sessionId = this.props.sessionId;

        let term = new Terminal({
            fontFamily: 'monaco, Consolas, "Lucida Console", monospace',
            fontSize: 14,
            theme: {
                background: '#1b1b1b'
            },
            rightClickSelectsWord: true,
        });

        term.open(document.getElementById('terminal'));
        term.writeln("等待用户输入中...")
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        fitAddon.fit();
        term.focus();

        term.onData(data => {

        });

        let token = getToken();
        let params = {
            'sessionId': sessionId,
            'X-Auth-Token': token
        };

        let paramStr = qs.stringify(params);

        let webSocket = new WebSocket(wsServer + '/ssh-monitor?' + paramStr);
        webSocket.onmessage = (e) => {
            let msg = Message.parse(e.data);
            switch (msg['type']) {
                case Message.Connected:
                    term.clear();
                    break;
                case Message.Data:
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
        this.setState({
            term: term,
            webSocket: webSocket,
        });
    }

    componentWillUnmount() {
        let webSocket = this.state.webSocket;
        if (webSocket) {
            webSocket.close()
        }
    }

    render() {
        return (
            <div>
                <div id='terminal' style={{
                    backgroundColor: '#1b1b1b'
                }}/>
            </div>
        );
    }
}

export default TermMonitor;