import React, {useEffect, useRef, useState} from 'react';
import {baseWebSocketUrl, getToken} from '@/src/api/core/requests';
import qs from "qs";
import {Terminal} from "@xterm/xterm";
import {FitAddon} from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import {useSearchParams} from "react-router-dom";
import {maybe} from "@/src/utils/maybe";
import {App, ConfigProvider, FloatButton, theme, Watermark} from "antd";
import FileSystemPage from "@/src/pages/access/FileSystemPage";
import SnippetSheet from "@/src/pages/access/SnippetSheet";
import SessionSharerModal from "@/src/pages/access/SessionSharerModal";
import {StyleProvider} from '@ant-design/cssinjs';
import portalApi, {ExportSession} from "@/src/api/portal-api";
import strings from "@/src/utils/strings";
import {
    Message,
    MessageTypeData,
    MessageTypeDirChanged,
    MessageTypeExit,
    MessageTypeJoin,
    MessageTypeKeepAlive,
    MessageTypeResize
} from './Terminal';
import {FolderOutlined, ShareAltOutlined, SnippetsOutlined, ToolOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";

export interface TerminalProps {
    assetId?: string
    sessionId?: string
    sharer?: boolean
}

let connected = false;
let websocket: WebSocket | undefined;
let interval;

let maxIdleSecond = -1;
let timeLeftSecond = -1;


const TerminalPage = ({}: TerminalProps) => {

    const terminalRef = React.useRef<HTMLDivElement>();

    let {t} = useTranslation();

    const [searchParams, setSearchParams] = useSearchParams();
    let assetId = maybe(searchParams.get('assetId'), '');
    let token = maybe(searchParams.get('token'), '');
    let sharer = maybe(searchParams.get('sharer'), false);

    let [sessionId, setSessionId] = useState(maybe(searchParams.get('sessionId'), ''));
    let [showButton, setShowButton] = useState<boolean>(false);
    let [exportSession, setExportSession] = useState<ExportSession>();
    let [floatButtonOpen, setFloatButtonOpen] = useState(false);

    let [fileSystemOpen, setFileSystemOpen] = useState(false);
    let [snippetOpen, setSnippetOpen] = useState(false);
    let [sharerOpen, setSharerOpen] = useState(false);

    let [title, setTitle] = useState('');
    const fsRef = useRef();

    useEffect(() => {
        document.title = title;
    }, [title]);

    const onDirChanged = (dir: string) => {
        // changeVal就是子组件暴露给父组件的方法
        // @ts-ignore
        fsRef.current?.changeDir(dir);
    };

    let {notification} = App.useApp();

    const writeErrorMessage = (term: Terminal, message: string) => {
        term.writeln(`\x1B[1;3;31m${message}\x1B[0m `);
    }

    const init = (term: Terminal, {id, idle, assetName}: ExportSession) => {

        let elementTerm = terminalRef.current;
        if (!elementTerm) {
            console.log(`fuck`)
            return
        }
        console.log(`elementTerm`, elementTerm)
        setTitle(assetName);
        term.open(elementTerm);
        let fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        fitAddon.fit();
        term.focus();

        term.attachCustomKeyEventHandler((domEvent) => {
            if (domEvent.ctrlKey && domEvent.key === 'c' && term.hasSelection()) {
                return false;
            }
            return !(domEvent.ctrlKey && domEvent.key === 'v');
        })

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
            'sharer': sharer,
            'sessionId': id,
        };

        let paramStr = qs.stringify(params);
        let websocket = new WebSocket(`${baseWebSocketUrl()}/access/terminal?${paramStr}`);
        websocket.onopen = (e => {
            term.clear();
            if (!sharer) {
                term.onResize(function (evt) {
                    console.log(`term resize`, evt.cols, evt.rows);
                    websocket.send(new Message(MessageTypeResize, `${evt.cols},${evt.rows}`).toString());
                });
            }
            window.addEventListener("resize", () => {
                fitAddon && fitAddon.fit();
            });

            interval = setInterval(() => {
                websocket.send(new Message(MessageTypeKeepAlive, "").toString());
            }, 5000);
        });

        websocket.onerror = (e) => {
            console.error(`websocket error`, e)
            writeErrorMessage(term, `websocket error`);
            if (interval) {
                clearInterval(interval);
            }
        }

        websocket.onclose = (e) => {
            writeErrorMessage(term, `connection is closed.`);
        }

        term.onData(data => {
            i_do();
            if (websocket !== undefined) {
                websocket.send(new Message(MessageTypeData, data).toString());
            }
        });

        websocket.onmessage = (e) => {
            let msg = Message.parse(e.data);
            switch (msg.type) {
                case MessageTypeData:
                    term.write(msg.content);
                    break;
                case MessageTypeJoin:
                    notification.success({
                        message: 'sharer joined from',
                        description: msg.content,
                        duration: -1
                    })
                    break;
                case MessageTypeExit:
                    notification.info({
                        message: 'sharer exited from',
                        description: msg.content,
                        duration: -1
                    })
                    break;
                case MessageTypeDirChanged:
                    onDirChanged(msg.content);
                    break;
            }
        }

        maxIdleSecond = idle;
        timeLeftSecond = idle;

        i_do_not_leave(websocket);
        return websocket;
    }

    const i_do = () => {
        timeLeftSecond = maxIdleSecond;
        // console.log(`i_do`, maxIdleSecond, timeLeftSecond);
    }

    const i_do_not_leave = (websocket: WebSocket) => {
        if (timeLeftSecond <= 0) {
            return
        }
        let timer = setInterval(() => {
            if (timeLeftSecond <= 0) {
                clearInterval(timer);
                websocket.close(3886, 'client quit');
            }
            timeLeftSecond -= 1;
            // console.log(`timeLeftSecond`, timeLeftSecond)
        }, 1000);
    }

    const handleUnload = (e: BeforeUnloadEvent) => {
        const message = "Leave?"; // 英文版的提示信息
        e.returnValue = message;
        return message;
    }

    useEffect(() => {
        if (connected) {
            return
        }
        connected = true;
        let term = new Terminal({
            fontFamily: 'monaco, Consolas, "Lucida Console", monospace',
            fontSize: 15,
            theme: {
                background: '#141414'
            },
        });

        if (sessionId === "") {
            const createSession = async () => {
                let session: ExportSession;
                try {
                    session = await portalApi.createSessionByAssetsId(assetId);
                } catch (e: any) {
                    writeErrorMessage(term, `create session err，${e?.message}`);
                    return
                }
                sessionId = session.id;
                setSessionId(sessionId);
                setShowButton(true);
                setExportSession(session);
                websocket = init(term, session);
            }
            createSession();
        } else {
            const getSession = async () => {
                let session: ExportSession;
                try {
                    session = await portalApi.getSessionById(sessionId);
                } catch (e: any) {
                    writeErrorMessage(term, `get session err，${e?.message}`);
                    return
                }
                sessionId = session.id;
                setSessionId(sessionId);
                setShowButton(false);
                setExportSession(session);
                websocket = init(term, session);
            }
            getSession();
        }

        const visibilitychange = async () => {
            if (!document.hidden) {
                if (exportSession) {
                    let v = JSON.parse(JSON.stringify(exportSession));
                    setExportSession(v);
                } else {
                    let session: ExportSession;
                    try {
                        session = await portalApi.getSessionById(sessionId);
                        setExportSession(session);
                    } catch (e: any) {
                        // writeErrorMessage(term, `get session err，${e?.message}`);
                        return
                    }
                }
            }
        }

        // findScroller(document.body)

        window.addEventListener('beforeunload', handleUnload);
        window.addEventListener('visibilitychange', visibilitychange, false)
        return () => {
            // term.dispose();
            // if (websocket) {
            //     websocket.close(3886, 'client quit');
            // }
            window.removeEventListener('beforeunload', handleUnload);
            window.removeEventListener('visibilitychange', visibilitychange);
        }

    }, []);

    return (
        <div className={'overflow-hidden'}>
            <Watermark
                zIndex={exportSession?.watermark?.enabled ? 9 : -1}
                content={exportSession?.watermark?.content}
                font={{color: exportSession?.watermark?.color, fontSize: exportSession?.watermark?.size}}>

                <div ref={terminalRef}
                     className={'h-screen w-screen p-2 bg-[#141414]'}
                />
            </Watermark>

            <ConfigProvider theme={{
                algorithm: theme.darkAlgorithm,
                components: {
                    Drawer: {
                        paddingLG: 16
                    },
                    Table: {
                        cellPaddingBlockSM: 6,
                        headerBorderRadius: 4,
                    }
                }
            }}>
                <App>
                    <StyleProvider hashPriority="high">
                        {
                            showButton ?
                                <FloatButton.Group shape="circle"
                                                   open={floatButtonOpen}
                                                   trigger="click"
                                                   onClick={() => {
                                                       setFloatButtonOpen(!floatButtonOpen)
                                                   }}
                                                   icon={<ToolOutlined/>}
                                >
                                    {exportSession?.fileSystem ?
                                        <FloatButton icon={<FolderOutlined/>} tooltip={t('filesystem')}
                                                     onClick={() => setFileSystemOpen(true)}/>
                                        : undefined
                                    }

                                    <FloatButton icon={<ShareAltOutlined/>} tooltip={t('access.session-share')}
                                                 onClick={() => setSharerOpen(true)}/>

                                    <FloatButton icon={<SnippetsOutlined/>} tooltip={t('menus.snippet')}
                                                 onClick={() => setSnippetOpen(true)}/>

                                </FloatButton.Group> : undefined
                        }

                        <FileSystemPage fsId={sessionId}
                                        strategy={exportSession?.strategy}
                                        open={fileSystemOpen}
                                        mask={false}
                                        maskClosable={false}
                                        onClose={() => setFileSystemOpen(false)}
                                        ref={fsRef}
                        />

                        <SnippetSheet
                            onClose={() => setSnippetOpen(false)}
                            onUse={(content: string) => {
                                websocket?.send(new Message(MessageTypeData, content).toString());
                            }}
                            open={snippetOpen}
                        />

                        <SessionSharerModal sessionId={sessionId} open={sharerOpen}
                                            onClose={() => setSharerOpen(false)}/>
                    </StyleProvider>
                </App>
            </ConfigProvider>
        </div>
    );
};

export default TerminalPage;