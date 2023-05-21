import React, {useEffect, useState} from 'react';
import {useSearchParams} from "react-router-dom";
import commandApi from "../../api/command";
import Message from "../access/Message";
import {Input, Layout, Spin} from "antd";
import {ProCard} from "@ant-design/pro-components";
import "xterm/css/xterm.css"
import "./ExecuteCommand.css"
import sessionApi from "../../api/session";
import {Terminal} from "xterm";
import {FitAddon} from "xterm-addon-fit";
import {getToken} from "../../utils/utils";
import qs from "qs";
import {wsServer} from "../../common/env";
import {CloseOutlined} from "@ant-design/icons";
import {useQuery} from "react-query";
import {xtermScrollPretty} from "../../utils/xterm-scroll-pretty";
import strings from "../../utils/strings";

const {Search} = Input;
const {Content} = Layout;

const ExecuteCommand = () => {

    let [sessions, setSessions] = useState([]);
    const [searchParams, _] = useSearchParams();
    let commandId = searchParams.get('commandId');

    let commandQuery = useQuery('commandQuery', () => commandApi.getById(commandId),{
        onSuccess: data => {
            let commands = data.content.split('\n');
            if (!commands) {
                return;
            }

            items.forEach(item => {
                if (getReady(item['id']) === false) {
                    initTerm(item['id'], commands);
                }
            })
        },
        refetchOnWindowFocus: false
    });
    let [inputValue, setInputValue] = useState('');

    let items = JSON.parse(searchParams.get('assets'));
    let [assets, setAssets] = useState(items);

    let readies = {};
    for (let i = 0; i < items.length; i++) {
        readies[items[i].id] = false;
        items[i]['locked'] = false;
    }

    useEffect(() => {

        window.addEventListener('resize', handleWindowResize);

        return function cleanup() {
            window.removeEventListener('resize', handleWindowResize);
            sessions.forEach(session => {
                if (session['ws']) {
                    session['ws'].close();
                }
                if (session['term']) {
                    session['term'].dispose();
                }
            })
        }
    }, [commandId]);

    const handleWindowResize = () => {
        sessions.forEach(session => {
            session['fitAddon'].fit();
            let ws = session['ws'];
            if (ws && ws.readyState === WebSocket.OPEN) {
                let term = session['term'];
                let terminalSize = {
                    cols: term.cols,
                    rows: term.rows
                }
                ws.send(new Message(Message.Resize, window.btoa(JSON.stringify(terminalSize))).toString());
            }
        })
    }

    const handleInputChange = (e) => {
        let value = e.target.value;
        setInputValue(value);
    }

    const handleExecuteCommand = (value) => {
        sessions.forEach(session => {
            let ws = session['ws'];
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(new Message(Message.Data, value + String.fromCharCode(13)).toString());
            }
        })
        setInputValue('');
    }

    const addSession = (session) => {
        sessions.push(session);
        setSessions(sessions.slice());
    }

    const setReady = (id, ready) => {
        readies[id] = ready;
    }

    const getReady = (id) => {
        return readies[id];
    }

    const initTerm = async (assetId, commands) => {
        let session = await sessionApi.create(assetId, 'native');
        let sessionId = session['id'];

        let term = new Terminal({
            fontFamily: 'monaco, Consolas, "Lucida Console", monospace', fontSize: 15, theme: {
                background: '#2d2f2c'
            }, rightClickSelectsWord: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(document.getElementById(assetId));
        fitAddon.fit();
        term.focus();

        term.writeln('Trying to connect to the server ...');
        xtermScrollPretty();

        let token = getToken();
        let params = {
            'cols': term.cols, 'rows': term.rows, 'sessionId': sessionId, 'X-Auth-Token': token
        };

        let paramStr = qs.stringify(params);

        let webSocket = new WebSocket(`${wsServer}/sessions/${sessionId}/ssh?${paramStr}`);

        term.onData(data => {
            if (webSocket) {
                webSocket.send(new Message(Message.Data, data).toString());
            }
        });

        webSocket.onerror = (e) => {
            term.writeln("Failed to connect to server.");
        }
        webSocket.onclose = (e) => {
            term.writeln("Connection is closed.");
        }

        webSocket.onmessage = (e) => {
            let msg = Message.parse(e.data);
            switch (msg['type']) {
                case Message.Connected:
                    term.clear();
                    sessionApi.connect(sessionId);

                    for (let i = 0; i < commands.length; i++) {
                        let command = commands[i];
                        if (!strings.hasText(command)) {
                            continue
                        }
                        webSocket.send(new Message(Message.Data, command + String.fromCharCode(13)).toString());
                    }
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
        addSession({'id': assetId, 'ws': webSocket, 'term': term, 'fitAddon': fitAddon});
        setReady(assetId, true);
    }

    const handleRemoveTerm = (id) => {
        let session = sessions.find(item => item.id === id);
        session.ws.close();
        session.term.dispose();
        let result = assets.filter(item => item.id !== id);
        setAssets(result);
    }

    return (
        <div>
            <Content className="page-container">
                <div className="page-search">
                    <Search placeholder="请输入指令" value={inputValue} onChange={handleInputChange}
                            onSearch={handleExecuteCommand} enterButton='执行'/>
                </div>
            </Content>

            <Spin spinning={commandQuery.isLoading} tip='正在获取指令内容...'>
                <div className="page-card">
                    <ProCard ghost gutter={[8, 8]} wrap>
                        {assets.map(item => {

                            return <ProCard
                                className={'term-container'}
                                key={item['id']}
                                extra={<div style={{cursor: 'pointer'}} onClick={() => handleRemoveTerm(item['id'])}>
                                    <CloseOutlined/></div>}
                                title={item['name']}
                                layout="center"
                                headerBordered
                                size={'small'}
                                colSpan={12}
                                bordered>

                                <div id={item['id']} style={{width: '100%', height: '100%'}}/>
                            </ProCard>

                        })}

                        {/*<ProCard*/}
                        {/*    className={'term-adder'}*/}
                        {/*    layout="center"*/}
                        {/*    colSpan={12}*/}
                        {/*    bordered>*/}
                        {/*    <Button type="dashed" style={{width: '100%', height: '100%'}} icon={<PlusOutlined />}/>*/}
                        {/*</ProCard>*/}
                    </ProCard>
                </div>
            </Spin>

        </div>
    );
};

export default ExecuteCommand;