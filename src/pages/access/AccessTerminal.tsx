import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Terminal} from "@xterm/xterm";
import {FitAddon} from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import portalApi, {ExportSession} from "@/src/api/portal-api";
import {
    Message,
    MessageTypeData,
    MessageTypeDirChanged,
    MessageTypeExit,
    MessageTypeJoin,
    MessageTypeKeepAlive,
    MessageTypeResize
} from "@/src/pages/access/Terminal";
import {useInterval, useWindowSize} from "react-use";
import {CleanTheme, useTerminalTheme} from "@/src/hook/use-terminal-theme";
import {useAccessTab} from "@/src/hook/use-access-tab";
import {ActivityIcon, FolderCode, FolderIcon, Share2Icon} from "lucide-react";
import SnippetSheet from "@/src/pages/access/SnippetSheet";
import SessionSharerModal from "@/src/pages/access/SessionSharerModal";
import AccessStats from "@/src/pages/access/AccessStats";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import clsx from "clsx";
import {debounce} from "@/src/utils/debounce";
import FileSystemPage from "@/src/pages/access/FileSystemPage";
import {App, Watermark} from "antd";
import Timeout, {TimeoutHandle} from "@/src/components/Timeout";
import {useAccessContentSize} from "@/src/hook/use-access-size";
import {cn} from "@/lib/utils";
import {baseWebSocketUrl, getToken} from "@/src/api/core/requests";
import qs from "qs";
import MultiFactorAuthentication from "@/src/pages/account/MultiFactorAuthentication";
import {isMobileByMediaQuery} from "@/src/utils/utils";
import {useTranslation} from "react-i18next";
import copy from "copy-to-clipboard";
import {useAccessSetting} from "@/src/hook/use-access-setting";

interface Props {
    assetId: string;
}

const AccessTerminal = ({assetId}: Props) => {

    let {t} = useTranslation();

    const divRef = React.useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal>();
    const fitRef = useRef<FitAddon>();

    let [websocket, setWebsocket] = useState<WebSocket>();
    let [session, setSession] = useState<ExportSession>();

    let [accessTheme] = useTerminalTheme();
    let [accessTab] = useAccessTab();
    let {width, height} = useWindowSize();
    let [accessSetting] = useAccessSetting();

    let [fileSystemOpen, setFileSystemOpen] = useState(false);
    let [preFileSystemOpen, setPreFileSystemOpen] = useState(false);

    let [snippetOpen, setSnippetOpen] = useState(false);
    let [sharerOpen, setSharerOpen] = useState(false);
    let [statsOpen, setStatsOpen] = useState(false);

    let [loading, setLoading] = useState(false);
    let [reconnected, setReconnected] = useState('');
    let [contentSize] = useAccessContentSize();

    let {notification, message} = App.useApp();
    const fsRef = useRef();

    const timeoutRef = useRef<TimeoutHandle>();
    let [mfaOpen, setMfaOpen] = useState(false);

    useInterval(() => {
        if (websocket?.readyState === WebSocket.OPEN) {
            websocket?.send(new Message(MessageTypeKeepAlive, "").toString());
        }
    }, 5000);

    const resetTimer = () => {
        timeoutRef.current?.reset();
        // console.log(`reset timer`, timeoutRef.current);
    }

    useEffect(() => {
        let current = accessTab.split('_')[1];
        if (current === assetId) {
            setTimeout(() => {
                terminalRef.current?.focus();
            }, 100);
            fitFit();
            setFileSystemOpen(preFileSystemOpen)
        } else {
            setFileSystemOpen(false);
        }
    }, [accessTab]);

    useEffect(() => {
        if (accessTheme && terminalRef) {
            let options = terminalRef.current?.options;
            if (options) {
                let cleanTheme = CleanTheme(accessTheme);
                options.theme = cleanTheme?.theme?.value;
                options.fontFamily = cleanTheme.fontFamily;
                options.fontSize = cleanTheme.fontSize;
                options.lineHeight = cleanTheme.lineHeight;
            }
        }
    }, [accessTheme]);

    useEffect(() => {
        let selectionChange = terminalRef.current?.onSelectionChange(async () => {
            // console.log(`on selection change`, accessSetting)
            if (accessSetting?.selectionCopy === false) {
                return
            }
            if (terminalRef.current?.hasSelection()) {
                let selection = terminalRef.current?.getSelection();
                copy(selection)
                message.success(t('general.copy_success'));
            }
        });

        const handleContextMenu = async (e: MouseEvent) => {
            // console.log(`on context menu`, accessSetting)
            if (accessSetting?.rightClickPaste === false) {
                return
            }
            e.preventDefault();
            const clipboardText = await navigator.clipboard.readText();
            websocket?.send(new Message(MessageTypeData, clipboardText).toString());
        }

        divRef?.current?.addEventListener("contextmenu", handleContextMenu);

        return () => {
            selectionChange?.dispose();
            divRef?.current?.removeEventListener("contextmenu", handleContextMenu);
        };
    }, [accessSetting, websocket]);

    useEffect(() => {
        if (terminalRef.current || !divRef.current) return;

        let cleanTheme = CleanTheme(accessTheme);
        let term = new Terminal({
            theme: cleanTheme?.theme?.value,
            fontFamily: cleanTheme.fontFamily,
            fontSize: cleanTheme.fontSize,
            lineHeight: cleanTheme.lineHeight,
            allowProposedApi: true,
            cursorBlink: true,
        });

        term.attachCustomKeyEventHandler((domEvent) => {
            if (domEvent.ctrlKey && domEvent.key === 'c' && term.hasSelection()) {
                return false;
            }
            return !(domEvent.ctrlKey && domEvent.key === 'v');
        })

        term.open(divRef.current);
        let fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        terminalRef.current = term;
        fitRef.current = fitAddon;

        fitAddon.fit();
        term.focus();

        return () => {
            term.dispose();
            fitAddon.dispose();
        }
    }, []);

    useEffect(() => {
        fitFit();
    }, [width, height, contentSize]);

    const onDirChanged = (dir: string) => {
        // changeVal就是子组件暴露给父组件的方法
        // @ts-ignore
        fsRef.current?.changeDir(dir);
    };

    const connect = async (securityToken?: string) => {
        if (loading === true) {
            return;
        }
        setLoading(true);
        let session: ExportSession;
        try {
            session = await portalApi.createSessionByAssetsId(assetId, securityToken);
            setSession(session);
        } catch (e) {
            terminalRef.current?.writeln(`\x1b[41m ERROR \x1b[0m : ${e.message}`);
            return;
        }

        let cols = terminalRef.current.cols;
        let rows = terminalRef.current.rows;
        let authToken = getToken();
        let params = {
            'cols': cols,
            'rows': rows,
            'X-Auth-Token': authToken,
            'sessionId': session.id,
        };

        let paramStr = qs.stringify(params);
        let websocket = new WebSocket(`${baseWebSocketUrl()}/access/terminal?${paramStr}`);

        terminalRef.current?.writeln('trying to connect to the server...');
        websocket.onopen = (e => {
            setLoading(false);
        });

        websocket.onerror = (e) => {
            console.error(`websocket error`, e);
            terminalRef.current?.writeln(`websocket error`);
        }

        websocket.onclose = (e) => {
            if (e.code === 3886) {
                terminalRef.current?.writeln('');
                terminalRef.current?.writeln('');
                terminalRef.current?.writeln(`\x1b[41m ${session.protocol.toUpperCase()} \x1b[0m ${session.assetName}: session timeout.`);
            } else {
                terminalRef.current?.writeln('');
                terminalRef.current?.writeln('');
                terminalRef.current?.writeln(`\x1b[41m ${session.protocol.toUpperCase()} \x1b[0m ${session.assetName}: session closed.`);
            }
            setLoading(false);
            terminalRef.current?.writeln('Press any key to reconnect');

            setWebsocket(null);
        }

        websocket.onmessage = (e) => {
            let msg = Message.parse(e.data);
            switch (msg.type) {
                case MessageTypeData:
                    terminalRef.current.write(msg.content);
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
        setWebsocket(websocket);
    }

    const connectWrap = async () => {
        let required = await portalApi.getAccessRequireMFA();
        if (required) {
            setMfaOpen(true);
        } else {
            connect();
        }
    }

    useEffect(() => {
        if (!terminalRef.current) {
            return;
        }
        connectWrap();
    }, [terminalRef.current, reconnected]);

    useEffect(() => {
        let sizeListener = terminalRef.current?.onResize(function (evt) {
            // console.log(`term resize`, evt.cols, evt.rows);
            websocket?.send(new Message(MessageTypeResize, `${evt.cols},${evt.rows}`).toString());
        });
        let dataListener = terminalRef.current?.onData(data => {
            if (!websocket) {
                setReconnected(new Date().toString());
            } else {
                websocket?.send(new Message(MessageTypeData, data).toString());
            }
            resetTimer();
        });

        return () => {
            sizeListener?.dispose();
            dataListener?.dispose();
            websocket?.close();
        }
    }, [websocket]);

    const fitFit = useMemo(() => debounce(() => {
        if (terminalRef.current && fitRef.current) {
            fitRef.current.fit();
        }
    }, 300), []);

    let isMobile = isMobileByMediaQuery();

    useEffect(() => {
        if (isMobile) {
            document.body.style.overflow = 'hidden';
        }
    }, [isMobile]);

    return (
        <div>
            <div className={cn(
                'flex',
                isMobile && 'h-screen',
                !isMobile && 'h-full',
            )}
            >
                <ResizablePanelGroup direction="horizontal">
                    <ResizablePanel order={1} onResize={(curr, prev) => {
                        fitFit();
                    }}>
                        <Watermark content={session?.watermark?.content}
                                   font={{
                                       color: session?.watermark?.color,
                                       fontSize: session?.watermark?.size,
                                   }}
                                   zIndex={session?.watermark?.enabled ? 9 : -1}
                                   style={{
                                       background: 'transparent'
                                   }}
                        >
                            <div className={'flex flex-col transition duration-100'}
                                 style={{
                                     height: isMobile ? height : height - 77.5,
                                 }}
                            >

                                {isMobile &&
                                    <div
                                        className={'h-[40px] bg-[#1b1b1b] grid grid-cols-6 text-white text-center items-center'}>
                                        <div onClick={() => {
                                            websocket?.send(new Message(MessageTypeData, '\x1b').toString());
                                            terminalRef.current?.focus();
                                        }}>
                                            ESC
                                        </div>
                                        <div onClick={() => {
                                            websocket?.send(new Message(MessageTypeData, '\x09').toString());
                                            terminalRef.current?.focus();
                                        }}>
                                            ⇥
                                        </div>
                                        <div onClick={() => {
                                            websocket?.send(new Message(MessageTypeData, '\x02').toString());
                                            terminalRef.current?.focus();
                                        }}>
                                            CTRL+B
                                        </div>
                                        <div onClick={() => {
                                            websocket.send(new Message(MessageTypeData, '\x03').toString());
                                            terminalRef.current?.focus();
                                        }}>
                                            CTRL+C
                                        </div>

                                        <div onClick={() => {
                                            websocket.send(new Message(MessageTypeData, '\x1b[A').toString());
                                            terminalRef.current?.focus();
                                        }}>
                                            ↑
                                        </div>
                                        <div onClick={() => {
                                            websocket.send(new Message(MessageTypeData, '\x1b[B').toString());
                                            terminalRef.current?.focus();
                                        }}>
                                            ↓
                                        </div>
                                    </div>
                                }

                                <div className={'p-2 flex-grow h-full'}
                                     style={{
                                         backgroundColor: accessTheme?.theme?.value['background'],
                                     }}
                                >
                                    <div className={'h-full'} ref={divRef}/>
                                </div>
                            </div>

                        </Watermark>
                    </ResizablePanel>
                    {
                        statsOpen && <>
                            <ResizableHandle withHandle/>
                            <ResizablePanel
                                defaultSize={22}
                                minSize={22}
                                maxSize={50}
                                order={2}
                                id={'stat'}
                                className={'min-w-[340px]'}
                            >
                                <div>
                                    <AccessStats sessionId={session?.id} open={statsOpen}/>
                                </div>
                            </ResizablePanel>
                        </>
                    }

                </ResizablePanelGroup>

                {isMobile &&
                    <div className={cn('absolute right-4 top-4 p-2 rounded bg-[#1E1F22]', isMobile && 'top-12')}>
                        <Share2Icon className={cn('h-4 w-4', isMobile && 'text-white')}
                                    onClick={() => setSharerOpen(true)}/>
                    </div>
                }

                {!isMobile &&
                    <div className={'w-10 bg-[#1E1F22] flex flex-col items-center border'}>
                        <div className={'flex-grow py-4 space-y-6 cursor-pointer'}>
                            <Share2Icon className={'h-4 w-4'} onClick={() => setSharerOpen(true)}/>
                            <FolderIcon className={'h-4 w-4'} onClick={() => {
                                setFileSystemOpen(true);
                                setPreFileSystemOpen(true);
                            }}/>
                            <ActivityIcon className={clsx('h-4 w-4', statsOpen && 'text-blue-500')}
                                          onClick={() => setStatsOpen(!statsOpen)}
                            />
                            <FolderCode className={'h-4 w-4'} onClick={() => setSnippetOpen(true)}/>
                        </div>
                    </div>
                }
            </div>

            <SnippetSheet
                onClose={() => setSnippetOpen(false)}
                onUse={(content: string) => {
                    websocket?.send(new Message(MessageTypeData, content).toString());
                }}
                open={snippetOpen}
                mask={false}
            />
            <SessionSharerModal sessionId={session?.id} open={sharerOpen}
                                onClose={() => setSharerOpen(false)}/>

            <FileSystemPage fsId={session?.id}
                            strategy={session?.strategy}
                            open={fileSystemOpen}
                            mask={false}
                            maskClosable={false}
                            onClose={() => {
                                setFileSystemOpen(false)
                                setPreFileSystemOpen(false);
                            }}
                            ref={fsRef}
            />

            <Timeout
                ref={timeoutRef}
                fn={() => {
                    websocket?.close(3886);
                    console.log(`client disconnect by timeout`, session?.idle)
                }}
                ms={session?.idle * 1000}
            />

            <MultiFactorAuthentication
                open={mfaOpen}
                handleOk={async (securityToken) => {
                    setMfaOpen(false);
                    connect(securityToken);
                }}
                handleCancel={() => setMfaOpen(false)}
            />
        </div>
    );
};

export default AccessTerminal;