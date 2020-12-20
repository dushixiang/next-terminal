import React, {Component} from 'react';
import "xterm/css/xterm.css"
import {Terminal} from "xterm";
import {AttachAddon} from 'xterm-addon-attach';
import qs from "qs";
import {prefix, wsServer} from "../../common/constants";
import "./Console.css"
import {getToken} from "../../utils/utils";


function getGeometry(width, height) {
    const cols = Math.floor(width / 9);
    const rows = Math.floor(height / 17);
    return [cols, rows];
}

class Console extends Component {

    state = {
        containerOverflow: 'hidden',
        containerWidth: 0,
        containerHeight: 0,
        term: null,
    };

    componentDidMount() {

        let command = this.props.command;
        let assetId = this.props.assetId;
        let width = this.props.width;
        let height = this.props.height;

        // let width = Math.floor(window.innerWidth * scale);
        // let height = Math.floor(window.innerHeight * scale);

        let params = {
            'width': width,
            'height': height,
            'assetId': assetId
        };

        let paramStr = qs.stringify(params);

        let [cols, rows] = getGeometry(width, height);
        let term = new Terminal({
            cols: cols,
            rows: rows,
            // screenKeys: true,
            // fontFamily: 'menlo',
        });

        // let fitAddon = new FitAddon();
        // term.loadAddon(fitAddon);
        term.open(this.refs.terminal);
        // fitAddon.fit();

        term.writeln('正在努力连接服务器中...');
        term.onResize(e => {

        });

        let token = getToken();

        let webSocket = new WebSocket(wsServer + prefix + '/ssh?X-Auth-Token=' + token + '&' + paramStr);
        term.loadAddon(new AttachAddon(webSocket));
        this.props.appendWebsocket(webSocket);

        webSocket.onopen = (e => {
            term.clear();
            term.focus();

            if (command !== '') {
                webSocket.send(command + String.fromCharCode(13));
            }

        });


        this.setState({
            term: term,
            containerWidth: width,
            containerHeight: height
        });

        // window.addEventListener('resize', this.onWindowResize);
    }

    onWindowResize = (e) => {
        let term = this.state.term;
        if (term) {
            const [cols, rows] = getGeometry(this.state.containerWidth, this.state.containerHeight);
            term.resize(cols, rows);
        }
    };

    render() {
        return (
            <div>
                <div ref='terminal' style={{
                    overflow: this.state.containerOverflow,
                    width: this.state.containerWidth,
                    height: this.state.containerHeight,
                    backgroundColor: 'black'
                }}/>
            </div>
        );
    }
}

export default Console;
