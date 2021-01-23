import React, {Component} from 'react';
import "xterm/css/xterm.css"
import {Terminal} from "xterm";
import qs from "qs";
import {wsServer} from "../../common/constants";
import "./Console.css"
import {getToken} from "../../utils/utils";
import {FitAddon} from 'xterm-addon-fit'


function getGeometry(width, height) {
    const cols = Math.floor(width / 9);
    const rows = Math.floor(height / 17) - 1;
    return [cols, rows];
}

class Console extends Component {

    state = {
        containerOverflow: 'hidden',
        width: 0,
        height: 0,
        term: undefined,
        webSocket: undefined,
        fitAddon: undefined
    };

    componentDidMount() {

        let command = this.props.command;
        let assetId = this.props.assetId;
        let width = this.props.width;
        let height = this.props.height;

        let params = {
            'width': width,
            'height': height,
            'assetId': assetId
        };

        let paramStr = qs.stringify(params);

        const ua = navigator.userAgent.toLowerCase();
        let lineHeight = 1;
        if (ua.includes('windows')) {
            lineHeight = 1.1;
        }

        let term = new Terminal({
            fontFamily: 'monaco, Consolas, "Lucida Console", monospace',
            fontSize: 14,
            lineHeight: lineHeight,
            theme: {
                background: '#1b1b1b'
            },
            rightClickSelectsWord: true,
        });

        let fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(this.refs.terminal);

        term.writeln('Trying to connect to the server ...');
        term.onResize(e => {

        });

        term.onData(data => {
            let webSocket = this.state.webSocket;
            if (webSocket !== undefined) {
                webSocket.send(JSON.stringify({type: 'data', content: data}));
            }
        });

        let token = getToken();

        let webSocket = new WebSocket(wsServer + '/ssh?X-Auth-Token=' + token + '&' + paramStr);

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
                case 'data':
                    term.write(msg['content']);
                    break;
                case 'closed':
                    term.writeln(`\x1B[1;3;31m${msg['content']}\x1B[0m `)
                    webSocket.close();
                    break;
            }

            if (!executedCommand) {
                if (command !== '') {
                    let webSocket = this.state.webSocket;
                    if (webSocket !== undefined && webSocket.readyState === WebSocket.OPEN) {
                        webSocket.send(JSON.stringify({type: 'data', content: command + String.fromCharCode(13)}));
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
            if(webSocket.readyState === WebSocket.OPEN){
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
