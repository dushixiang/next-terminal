import React, {Component} from 'react';
import "xterm/css/xterm.css"
import {Terminal} from "xterm";
import qs from "qs";
import {wsServer} from "../../common/env";
import {getToken, isEmpty} from "../../utils/utils";
import {FitAddon} from 'xterm-addon-fit';
import "./Access.css"
import request from "../../common/request";
import {Affix, Button, Drawer, Dropdown, Menu, message, Modal, Tooltip} from "antd";
import {CodeOutlined, ExclamationCircleOutlined, FolderOutlined, LineChartOutlined} from "@ant-design/icons";
import Draggable from "react-draggable";
import FileSystem from "../devops/FileSystem";
import Stats from "./Stats";

class Term extends Component {

    statsRef = undefined;

    state = {
        width: window.innerWidth,
        height: window.innerHeight,
        term: undefined,
        webSocket: undefined,
        fitAddon: undefined,
        sessionId: undefined,
        enterBtnIndex: 1001,
        commands: []
    };

    componentDidMount = async () => {

        let urlParams = new URLSearchParams(this.props.location.search);
        let assetId = urlParams.get('assetId');
        document.title = urlParams.get('assetName');

        let sessionId = await this.createSession(assetId);
        if (isEmpty(sessionId)) {
            return;
        }

        let term = new Terminal({
            fontFamily: 'monaco, Consolas, "Lucida Console", monospace',
            fontSize: 15,
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
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(selection);
            }
        });

        term.attachCustomKeyEventHandler((e) => {
            let selection = term.getSelection();
            if (e.ctrlKey && e.key === 'c' && selection != "") {
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
        let params = {
            'cols': term.cols,
            'rows': term.rows,
            'sessionId': sessionId,
            'X-Auth-Token': token
        };

        let paramStr = qs.stringify(params);

        let webSocket = new WebSocket(wsServer + '/ssh?' + paramStr);

        let pingInterval;
        webSocket.onopen = (e => {
            pingInterval = setInterval(() => {
                webSocket.send(JSON.stringify({type: 'ping'}))
            }, 5000);
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
                    this.updateSessionStatus(sessionId);
                    this.getCommands();
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
            fitAddon: fitAddon,
            sessionId: sessionId
        });

        window.addEventListener('resize', this.onWindowResize);
    }

    componentWillUnmount() {
        let webSocket = this.state.webSocket;
        if (webSocket) {
            webSocket.close()
        }
    }

    getCommands = async () => {
        let result = await request.get('/commands');
        if (result.code !== 1) {
            message.error(result.message);
        }
        this.setState({
            commands: result['data']
        })
    }

    showMessage(msg) {
        message.destroy();
        Modal.confirm({
            title: '提示',
            icon: <ExclamationCircleOutlined/>,
            content: msg,
            centered: true,
            okText: '重新连接',
            cancelText: '关闭页面',
            onOk() {
                window.location.reload();
            },
            onCancel() {
                window.close();
            },
        });
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
                this.focus();
                let terminalSize = {
                    cols: term.cols,
                    rows: term.rows
                }
                webSocket.send(JSON.stringify({type: 'resize', content: JSON.stringify(terminalSize)}));
            }
        });
    };

    writeCommand = (command) => {
        let webSocket = this.state.webSocket;
        if (webSocket !== undefined) {
            webSocket.send(JSON.stringify({type: 'data', content: command}));
        }
        this.focus();
    }

    focus = () => {
        let term = this.state.term;
        if (term) {
            term.focus();
        }
    }

    onRef = (statsRef) => {
        this.statsRef = statsRef;
    }

    render() {

        const cmdMenuItems = this.state.commands.map(item => {
            return <Tooltip placement="left" title={item['content']} color='blue' key={'t-' + item['id']}>
                <Menu.Item onClick={() => {
                    this.writeCommand(item['content'])
                }} key={'i-' + item['id']}>{item['name']}</Menu.Item>
            </Tooltip>;
        });

        const cmdMenu = (
            <Menu>
                {cmdMenuItems}
            </Menu>
        );

        return (
            <div>
                <div ref='terminal' id='terminal' style={{
                    height: this.state.height,
                    width: this.state.width,
                    backgroundColor: 'black',
                    overflowX: 'hidden',
                    overflowY: 'hidden',
                }}/>

                <Draggable>
                    <Affix style={{position: 'absolute', top: 50, right: 50, zIndex: this.state.enterBtnIndex}}>
                        <Button icon={<FolderOutlined/>} onClick={() => {
                            this.setState({
                                fileSystemVisible: true,
                                enterBtnIndex: 999, // xterm.js 输入框的zIndex是1000，在弹出文件管理页面后要隐藏此按钮
                            });
                        }}/>
                    </Affix>
                </Draggable>

                <Draggable>
                    <Affix style={{position: 'absolute', top: 50, right: 100, zIndex: this.state.enterBtnIndex}}>
                        <Dropdown overlay={cmdMenu} trigger={['click']} placement="bottomLeft">
                            <Button icon={<CodeOutlined/>}/>
                        </Dropdown>
                    </Affix>
                </Draggable>

                <Draggable>
                    <Affix style={{position: 'absolute', top: 100, right: 100, zIndex: this.state.enterBtnIndex}}>
                        <Button icon={<LineChartOutlined/>} onClick={() => {
                            this.setState({
                                statsVisible: true,
                                enterBtnIndex: 999, // xterm.js 输入框的zIndex是1000，在弹出文件管理页面后要隐藏此按钮
                            });
                            if(this.statsRef){
                                this.statsRef.addInterval();
                            }
                        }}/>
                    </Affix>
                </Draggable>

                <Drawer
                    title={'会话详情'}
                    placement="right"
                    width={window.innerWidth * 0.8}
                    closable={true}
                    // maskClosable={false}
                    onClose={() => {
                        this.setState({
                            fileSystemVisible: false,
                            enterBtnIndex: 1001, // xterm.js 输入框的zIndex是1000，在隐藏文件管理页面后要显示此按钮
                        });
                        this.focus();
                    }}
                    visible={this.state.fileSystemVisible}
                >
                    <FileSystem
                        storageId={this.state.sessionId}
                        storageType={'sessions'}
                        minHeight={window.innerHeight - 103}/>
                </Drawer>

                <Drawer
                    title={'状态信息'}
                    placement="right"
                    width={window.innerWidth * 0.8}
                    closable={true}
                    onClose={() => {
                        this.setState({
                            statsVisible: false,
                            enterBtnIndex: 1001, // xterm.js 输入框的zIndex是1000，在隐藏文件管理页面后要显示此按钮
                        });
                        this.focus();
                        if (this.statsRef) {
                            this.statsRef.delInterval();
                        }
                    }}
                    visible={this.state.statsVisible}
                >
                    <Stats sessionId={this.state.sessionId} onRef={this.onRef}/>
                </Drawer>
            </div>
        );
    }
}

export default Term;
