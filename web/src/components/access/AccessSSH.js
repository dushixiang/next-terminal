import React, {Component} from 'react';
import "xterm/css/xterm.css"
import {Terminal} from "xterm";
import qs from "qs";
import {wsServer} from "../../common/constants";
import "./Console.css"
import {getToken, isEmpty} from "../../utils/utils";
import {FitAddon} from 'xterm-addon-fit';
import "./Access.css"
import request from "../../common/request";
import {message} from "antd";

class AccessSSH extends Component {

    state = {
        width: window.innerWidth,
        height: window.innerHeight,
        term: undefined,
        webSocket: undefined,
        fitAddon: undefined
    };

    componentDidMount = async () => {

        let urlParams = new URLSearchParams(this.props.location.search);
        let assetId = urlParams.get('assetId');

        let sessionId = await this.createSession(assetId);
        if (isEmpty(sessionId)) {
            return;
        }

        let params = {
            'width': this.state.width,
            'height': this.state.height,
            'sessionId': sessionId
        };

        let paramStr = qs.stringify(params);

        let term = new Terminal({
            fontFamily: 'monaco, Consolas, "Lucida Console", monospace',
            fontSize: 14,
            // theme: {
            //     background: '#1b1b1b',
            //     lineHeight: 17
            // },
            rightClickSelectsWord: true,
        });

        term.open(this.refs.terminal);
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        fitAddon.fit();
        term.focus();

        term.writeln('Trying to connect to the server ...');

        term.onSelectionChange(async () => {
            let selection = term.getSelection();
            this.setState({
                selection: selection
            })
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(selection);
            }
        });

        term.attachCustomKeyEventHandler((e) => {
            if (e.ctrlKey && e.key === 'c' && this.state.selection) {
                return false;
            }
            return !(e.ctrlKey && e.key === 'v');
        });

        term.onData(data => {
            let webSocket = this.state.webSocket;
            if (webSocket !== undefined) {
                webSocket.send(JSON.stringify({type: 'data', content: data}));
            }
        });

        let token = getToken();

        let webSocket = new WebSocket(wsServer + '/ssh?X-Auth-Token=' + token + '&' + paramStr);

        let pingInterval;
        webSocket.onopen = (e => {
            pingInterval = setInterval(() => {
                webSocket.send(JSON.stringify({type: 'ping'}))
            }, 5000);

            let terminalSize = {
                cols: term.cols,
                rows: term.rows
            }
            webSocket.send(JSON.stringify({type: 'resize', content: JSON.stringify(terminalSize)}));
        });

        webSocket.onerror = (e) => {
            term.writeln("Failed to connect to server.");
        }
        webSocket.onclose = (e) => {
            term.writeln("Connection is closed.");
            if (pingInterval) {
                clearInterval(pingInterval);
            }
        }

        webSocket.onmessage = (e) => {
            let msg = JSON.parse(e.data);
            switch (msg['type']) {
                case 'connected':
                    term.clear();
                    this.onWindowResize();
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
        }

        this.setState({
            term: term,
            webSocket: webSocket,
            fitAddon: fitAddon
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
        let result = await request.post(`/sessions?assetId=${assetsId}`);
        if (result['code'] !== 1) {
            this.showMessage(result['message']);
            return null;
        }
        document.title = result['data']['name'];
        return result['data']['id'];
    }

    updateSessionStatus = async (sessionId) => {
        let result = await request.post(`/sessions/${sessionId}/connect`);
        if (result['code'] !== 1) {
            message.error(result['message']);
        }
    }

    terminalSize() {
        return {
            cols: Math.floor(this.state.width / 7.5),
            rows: Math.floor(window.innerHeight / 17),
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
                term.focus();
                let terminalSize = {
                    cols: term.cols,
                    rows: term.rows
                }
                webSocket.send(JSON.stringify({type: 'resize', content: JSON.stringify(terminalSize)}));
            }
        });
    };

    render() {
        return (
            <div>
                <div ref='terminal' id='terminal' style={{
                    height: this.state.height,
                    width: this.state.width,
                    backgroundColor: 'black',
                    overflowX: 'hidden',
                    overflowY: 'hidden',
                }}/>
            </div>
        );
    }
}

export default AccessSSH;
