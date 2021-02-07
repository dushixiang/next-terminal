import React, {Component} from 'react';
import "xterm/css/xterm.css"
import {Terminal} from "xterm";
import qs from "qs";
import {wsServer} from "../../common/constants";
import "./Console.css"
import {getToken, isEmpty} from "../../utils/utils";
import {FitAddon} from 'xterm-addon-fit'
import request from "../../common/request";
import {message} from "antd";

class Console extends Component {

    state = {
        containerOverflow: 'hidden',
        width: 0,
        height: 0,
        term: undefined,
        webSocket: undefined,
        fitAddon: undefined
    };

    componentDidMount = async () => {

        let command = this.props.command;
        let assetId = this.props.assetId;
        let width = this.props.width;
        let height = this.props.height;
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
                webSocket.send(JSON.stringify({type: 'data', content: data}));
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

        let webSocket = new WebSocket(wsServer + '/ssh?' + paramStr);

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
            let msg = JSON.parse(e.data);
            switch (msg['type']) {
                case 'connected':
                    term.clear();
                    this.updateSessionStatus(sessionId);
                    break;
                case 'data':
                    term.write(msg['content']);
                    break;
                case 'closed':
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
                        webSocket.send(JSON.stringify({
                            type: 'data',
                            content: command + String.fromCharCode(13)
                        }));
                    }
                }
                executedCommand = true;
            }
        }

        this.setState({
            term: term,
            fitAddon: fitAddon,
            webSocket: webSocket,
            width: width,
            height: height
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
        if (term && fitAddon && webSocket) {

            let height = term.cols;
            let width = term.rows;

            try {
                fitAddon.fit();
            } catch (e) {
                console.log(e);
            }

            term.focus();
            if (webSocket.readyState === WebSocket.OPEN) {
                webSocket.send(JSON.stringify({type: 'resize', content: JSON.stringify({height, width})}));
            }
        }
    };

    render() {
        return (
            <div>
                <div ref='terminal' id='terminal' style={{
                    overflow: this.state.containerOverflow,
                    width: this.state.width,
                    height: this.state.height,
                    backgroundColor: '#1b1b1b'
                }}/>
            </div>
        );
    }
}

export default Console;
