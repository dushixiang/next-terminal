import React, {Component} from 'react';
import "xterm/css/xterm.css"
import {Terminal} from "xterm";
import qs from "qs";
import {wsServer} from "../../common/env";
import "./BatchCommandTerm.css"
import {getToken, isEmpty} from "../../utils/utils";
import {FitAddon} from 'xterm-addon-fit'
import request from "../../common/request";
import {message} from "antd";
import Message from './Message'

class BatchCommandTerm extends Component {

    state = {
        term: undefined,
        webSocket: undefined,
        fitAddon: undefined
    };

    componentDidMount = async () => {

        let command = this.props.command;
        let assetId = this.props.assetId;

        let sessionId = await this.createSession(assetId);
        if (isEmpty(sessionId)) {
            return;
        }

        let term = new Terminal({
            fontFamily: 'monaco, Consolas, "Lucida Console", monospace',
            fontSize: 14,
            theme: {
                background: '#1b1b1b'
            },
            rightClickSelectsWord: true,
        });

        term.open(this.refs.terminal);
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        fitAddon.fit();
        term.focus();

        term.writeln('Trying to connect to the server ...');

        term.onData(data => {
            let webSocket = this.state.webSocket;
            if (webSocket !== undefined) {
                webSocket.send(new Message(Message.Data, data).toString());
            }
        });

        let token = getToken();
        let params = {
            'cols': term.cols,
            'rows': term.rows,
            'sessionId': sessionId,
            'X-Auth-Token': token
        };

        let paramStr = qs.stringify(params);

        let webSocket = new WebSocket(`${wsServer}/sessions/${sessionId}/ssh?${paramStr}`);

        this.props.appendWebsocket({'id': assetId, 'ws': webSocket});

        webSocket.onopen = (e => {
            this.onWindowResize();
        });

        webSocket.onerror = (e) => {
            term.writeln("Failed to connect to server.");
        }
        webSocket.onclose = (e) => {
            term.writeln("Connection is closed.");
        }

        let executedCommand = false
        webSocket.onmessage = (e) => {
            let msg = Message.parse(e.data);
            switch (msg['type']) {
                case Message.Connected:
                    term.clear();
                    this.updateSessionStatus(sessionId);
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

            if (!executedCommand) {
                if (command !== '') {
                    let webSocket = this.state.webSocket;
                    if (webSocket !== undefined && webSocket.readyState === WebSocket.OPEN) {
                        webSocket.send(new Message(Message.Data, command + String.fromCharCode(13)).toString());
                    }
                }
                executedCommand = true;
            }
        }

        this.setState({
            term: term,
            fitAddon: fitAddon,
            webSocket: webSocket,
        });

        window.addEventListener('resize', this.onWindowResize);
    }

    componentWillUnmount() {
        let webSocket = this.state.webSocket;
        if (webSocket) {
            webSocket.close()
        }
    }

    async createSession(assetsId) {
        let result = await request.post(`/sessions?assetId=${assetsId}&mode=naive`);
        if (result['code'] !== 1) {
            this.showMessage(result['message']);
            return null;
        }
        return result['data']['id'];
    }

    updateSessionStatus = async (sessionId) => {
        let result = await request.post(`/sessions/${sessionId}/connect`);
        if (result['code'] !== 1) {
            message.error(result['message']);
        }
    }

    onWindowResize = (e) => {
        let term = this.state.term;
        let fitAddon = this.state.fitAddon;
        let webSocket = this.state.webSocket;
        this.setState({
            width: window.innerWidth,
            height: window.innerHeight,
        }, () => {
            if (webSocket && webSocket.readyState === WebSocket.OPEN) {
                fitAddon.fit();
                this.focus();
                let terminalSize = {
                    cols: term.cols,
                    rows: term.rows
                }
                webSocket.send(new Message(Message.Resize, window.btoa(JSON.stringify(terminalSize))).toString());
            }
        });
    };

    focus = () => {
        let term = this.state.term;
        if (term) {
            term.focus();
        }
    }

    render() {
        return (
            <div>
                <div style={{
                    width: (window.innerWidth - 254) / 2,
                    height: 456,
                }}>
                    <div ref='terminal' id='terminal' style={{
                        backgroundColor: '#1b1b1b'
                    }}/>
                </div>

            </div>
        );
    }
}

export default BatchCommandTerm;
