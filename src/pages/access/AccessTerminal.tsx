import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Terminal} from "@xterm/xterm";
import {FitAddon} from "@xterm/addon-fit";
import {SearchAddon} from "@xterm/addon-search";
import {WebglAddon} from "@xterm/addon-webgl";
import {CanvasAddon} from "@xterm/addon-canvas";
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
import {
    ActivityIcon,
    BotIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    FolderCode,
    FolderIcon,
    SearchIcon,
    Share2Icon,
    XIcon
} from "lucide-react";
import SnippetSheet from "@/src/pages/access/SnippetSheet";
import SessionSharerModal from "@/src/pages/access/SessionSharerModal";
import ShellAssistantSheet from "@/src/pages/access/ShellAssistantSheet";
import AccessStats from "@/src/pages/access/AccessStats";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import clsx from "clsx";
import {debounce} from "@/src/utils/debounce";
import FileSystemPage from "@/src/pages/access/FileSystemPage";
import {App, Watermark} from "antd";
import {useAccessContentSize} from "@/src/hook/use-access-size";
import {cn} from "@/lib/utils";
import {baseWebSocketUrl, getToken} from "@/src/api/core/requests";
import qs from "qs";
import MultiFactorAuthentication from "@/src/pages/account/MultiFactorAuthentication";
import {isMobileByMediaQuery} from "@/src/utils/utils";
import {useTranslation} from "react-i18next";
import copy from "copy-to-clipboard";
import accessSettingApi, {Setting} from "@/src/api/access-setting-api";

interface Props {
    assetId: string;
}

const AccessTerminal = ({assetId}: Props) => {

    let {t} = useTranslation();

    const divRef = React.useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal>();
    const fitRef = useRef<FitAddon>();
    const searchRef = useRef<SearchAddon>();
    const webglRef = useRef<WebglAddon>();
    const canvasRef = useRef<CanvasAddon>();

    let [websocket, setWebsocket] = useState<WebSocket>();
    let [session, setSession] = useState<ExportSession>();

    let [accessTheme] = useTerminalTheme();
    let [accessTab] = useAccessTab();
    let {width, height} = useWindowSize();
    let [accessSetting, setAccessSetting] = useState<Setting>();

    let [fileSystemOpen, setFileSystemOpen] = useState(false);
    let [preFileSystemOpen, setPreFileSystemOpen] = useState(false);

    let [snippetOpen, setSnippetOpen] = useState(false);
    let [sharerOpen, setSharerOpen] = useState(false);
    let [statsOpen, setStatsOpen] = useState(false);
    let [shellAssistantOpen, setShellAssistantOpen] = useState(false);
    let [shellAssistantEnabled, setShellAssistantEnabled] = useState(false);

    let [loading, setLoading] = useState(false);
    let [reconnected, setReconnected] = useState('');
    let [contentSize] = useAccessContentSize();

    let {notification, message} = App.useApp();
    const fsRef = useRef();

    let [mfaOpen, setMfaOpen] = useState(false);

    // 搜索相关状态
    let [searchOpen, setSearchOpen] = useState(false);
    let [searchTerm, setSearchTerm] = useState('');
    let [searchMatchIndex, setSearchMatchIndex] = useState(0);
    let [searchMatchCount, setSearchMatchCount] = useState(0);

    // 获取访问设置和 Shell 助手状态
    useEffect(() => {
        const fetchAccessSetting = async () => {
            try {
                const setting = await accessSettingApi.get();
                setAccessSetting(setting);
            } catch (error) {
                console.error('Failed to fetch access setting:', error);
            }
        };
        
        const fetchShellAssistantEnabled = async () => {
            try {
                const result = await accessSettingApi.getShellAssistantEnabled();
                setShellAssistantEnabled(result.enabled);
            } catch (error) {
                console.error('Failed to fetch shell assistant enabled status:', error);
                setShellAssistantEnabled(false);
            }
        };
        
        fetchAccessSetting();
        fetchShellAssistantEnabled();
    }, []);

    useInterval(() => {
        if (websocket?.readyState === WebSocket.OPEN) {
            websocket?.send(new Message(MessageTypeKeepAlive, "").toString());
        }
    }, 5000);

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
        if (!terminalRef.current) {
            return;
        }

        let selectionChange = terminalRef.current.onSelectionChange(() => {
            // console.log(`on selection change`, accessSetting)
            if (accessSetting?.selectionCopy !== true) {
                return
            }
            if (terminalRef.current?.hasSelection()) {
                let selection = terminalRef.current?.getSelection();
                if (selection) {
                    copy(selection)
                    message.success(t('general.copy_success'));
                }
            }
        });

        const handleContextMenu = async (e: MouseEvent) => {
            // console.log(`on context menu`, accessSetting)
            if (accessSetting?.rightClickPaste !== true) {
                return
            }
            e.preventDefault();
            try {
                const clipboardText = await navigator.clipboard.readText();
                websocket?.send(new Message(MessageTypeData, clipboardText).toString());
            } catch (error) {
                console.warn('Failed to read clipboard:', error);
            }
        }

        const divElement = divRef.current;
        divElement?.addEventListener("contextmenu", handleContextMenu);

        return () => {
            selectionChange?.dispose();
            divElement?.removeEventListener("contextmenu", handleContextMenu);
        };
    }, [accessSetting, websocket, terminalRef.current]);

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
            // WebGL 渲染器性能优化配置
            convertEol: true, // 启用自动换行符转换
            fastScrollModifier: 'alt', // 启用快速滚动
            fastScrollSensitivity: 5, // 提高滚动敏感度
            scrollback: 10000, // 增加回滚缓冲区
            windowsMode: false, // 禁用 Windows 模式以提高性能
        });

        term.attachCustomKeyEventHandler((domEvent) => {
            if (domEvent.ctrlKey && domEvent.key === 'c' && term.hasSelection()) {
                return false;
            }
            // 支持 Ctrl+F (Windows/Linux) 和 Cmd+F (Mac)
            if ((domEvent.ctrlKey || domEvent.metaKey) && domEvent.key === 'f') {
                domEvent.preventDefault();
                setSearchOpen(true);
                return false;
            }
            return !(domEvent.ctrlKey && domEvent.key === 'v');
        })

        term.open(divRef.current);
        let fitAddon = new FitAddon();
        let searchAddon = new SearchAddon();
        term.loadAddon(fitAddon);
        term.loadAddon(searchAddon);

        // 尝试加载 WebGL 渲染器，失败时回退到 Canvas 渲染器
        let webglAddon: WebglAddon | null = null;
        let canvasAddon: CanvasAddon | null = null;
        
        try {
            webglAddon = new WebglAddon();
            term.loadAddon(webglAddon);
            console.log('✅ WebGL renderer loaded successfully - Hardware acceleration enabled');
            
            // WebGL 特定优化
            if (webglAddon && 'preserveDrawingBuffer' in webglAddon) {
                // 启用绘图缓冲区保持，提高渲染性能
                (webglAddon as any).preserveDrawingBuffer = false;
            }
        } catch (e) {
            console.warn('⚠️ Failed to load WebGL renderer, falling back to Canvas renderer:', e);
            try {
                canvasAddon = new CanvasAddon();
                term.loadAddon(canvasAddon);
                console.log('✅ Canvas renderer loaded successfully - Software acceleration enabled');
            } catch (e2) {
                console.warn('⚠️ Failed to load Canvas renderer, using default DOM renderer:', e2);
                console.log('🐌 Using DOM renderer - Performance may be reduced');
            }
        }

        terminalRef.current = term;
        fitRef.current = fitAddon;
        searchRef.current = searchAddon;
        webglRef.current = webglAddon;
        canvasRef.current = canvasAddon;

        fitAddon.fit();
        term.focus();

        return () => {
            term.dispose();
            fitAddon.dispose();
            webglAddon?.dispose();
            canvasAddon?.dispose();
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

    // 搜索功能函数
    const handleSearch = (term: string) => {
        if (!searchRef.current || !term) {
            setSearchMatchCount(0);
            setSearchMatchIndex(0);
            searchRef.current?.clearDecorations();
            return;
        }

        // 清除之前的搜索结果
        searchRef.current.clearDecorations();

        // 使用简单的文本匹配来计算总数
        const terminalContent = terminalRef.current?.buffer.active;
        if (terminalContent) {
            let totalMatches = 0;
            const searchTermLower = term.toLowerCase();

            // 遍历所有行来计算匹配数量
            for (let i = 0; i < terminalContent.length; i++) {
                const line = terminalContent.getLine(i);
                if (line) {
                    const lineText = line.translateToString().toLowerCase();
                    let lastIndex = 0;
                    while (true) {
                        const index = lineText.indexOf(searchTermLower, lastIndex);
                        if (index === -1) break;
                        totalMatches++;
                        lastIndex = index + 1;
                    }
                }
            }

            setSearchMatchCount(totalMatches);

            // 执行第一次搜索
            if (totalMatches > 0) {
                const result = searchRef.current.findNext(term, {
                    caseSensitive: false, // 大小写敏感
                    wholeWord: false,
                    regex: false
                });
                setSearchMatchIndex(result ? 1 : 0);
            } else {
                setSearchMatchIndex(0);
            }
        }
    };

    const decorations = {
        // 匹配项的背景颜色
        // matchBackground: '#FFD700', // 金色，明亮且易于识别
        // 匹配项的边框颜色
        // matchBorder: '#FF8C00', // 暗橙色，与背景形成对比
        // 匹配项在概览标尺中的颜色
        matchOverviewRuler: '#FFD700', // 与背景相同，使其在标尺中突出
        // 当前激活匹配项的背景颜色
        activeMatchBackground: '#FF4500', // 橙红色，清晰显示当前项
        // 当前激活匹配项的边框颜色
        activeMatchBorder: '#FF6347', // 西红柿色，进一步强调当前匹配
        // 当前激活匹配项在概览标尺中的颜色
        activeMatchColorOverviewRuler: '#FF4500', // 与激活背景相同，便于识别
    }

    const handleSearchNext = () => {
        if (!searchRef.current || !searchTerm) return;
        const result = searchRef.current.findNext(searchTerm, {
            caseSensitive: false,
            wholeWord: false,
            regex: false,
            decorations: decorations,
        });
        if (result && searchMatchCount > 0) {
            setSearchMatchIndex(prev => prev < searchMatchCount ? prev + 1 : 1);
        }
    };

    const handleSearchPrevious = () => {
        if (!searchRef.current || !searchTerm) return;
        const result = searchRef.current.findPrevious(searchTerm, {
            caseSensitive: false,
            wholeWord: false,
            regex: false,
            decorations: decorations,
        });
        if (result && searchMatchCount > 0) {
            setSearchMatchIndex(prev => prev > 1 ? prev - 1 : searchMatchCount);
        }
    };

    const clearSearch = () => {
        setSearchTerm('');
        setSearchMatchIndex(0);
        setSearchMatchCount(0);
        searchRef.current?.clearDecorations();
        setSearchOpen(false);
    };

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

                                <div className={'p-2 flex-grow h-full relative'}
                                     style={{
                                         backgroundColor: accessTheme?.theme?.value['background'],
                                     }}
                                >
                                    {/* 搜索框 */}
                                    {searchOpen && (
                                        <div
                                            className="absolute top-2 right-2 z-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg p-1.5 flex items-center gap-1.5 min-w-[240px]">
                                            <SearchIcon className="h-3.5 w-3.5 text-gray-500"/>
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => {
                                                    setSearchTerm(e.target.value);
                                                    handleSearch(e.target.value);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        if (e.shiftKey) {
                                                            handleSearchPrevious();
                                                        } else {
                                                            handleSearchNext();
                                                        }
                                                    } else if (e.key === 'Escape') {
                                                        clearSearch();
                                                    }
                                                }}
                                                // onBlur={(e) => {
                                                //     // 当搜索框失去焦点且没有搜索内容时，自动关闭搜索框
                                                //     if (!searchTerm.trim()) {
                                                //         setTimeout(() => {
                                                //             if (!searchTerm.trim()) {
                                                //                 setSearchOpen(false);
                                                //             }
                                                //         }, 100);
                                                //     }
                                                // }}
                                                placeholder={t('access.settings.terminal.search_placeholder') || '搜索终端内容...'}
                                                className="flex-1 px-1.5 py-0.5 text-xs border-none outline-none bg-transparent text-gray-900 dark:text-gray-100"
                                                autoFocus
                                            />
                                            {searchMatchCount > 0 && (
                                                <span className="text-[10px] text-gray-500 whitespace-nowrap">
                                                    {searchMatchIndex}/{searchMatchCount}
                                                </span>
                                            )}
                                            <div className="flex items-center gap-0.5">
                                                <button
                                                    onClick={handleSearchPrevious}
                                                    disabled={!searchTerm || searchMatchCount === 0}
                                                    className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <ChevronUpIcon className="h-3 w-3"/>
                                                </button>
                                                <button
                                                    onClick={handleSearchNext}
                                                    disabled={!searchTerm || searchMatchCount === 0}
                                                    className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <ChevronDownIcon className="h-3 w-3"/>
                                                </button>
                                                <button
                                                    onClick={clearSearch}
                                                    className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                                >
                                                    <XIcon className="h-3 w-3"/>
                                                </button>
                                            </div>
                                        </div>
                                    )}
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
                    <div
                        className={cn('absolute right-4 top-4 p-2 rounded bg-[#1E1F22] flex gap-2', isMobile && 'top-12')}>
                        <div title="搜索终端内容">
                            <SearchIcon
                                className={cn('h-4 w-4', isMobile && 'text-white', searchOpen && 'text-blue-400')}
                                onClick={() => setSearchOpen(!searchOpen)}
                            />
                        </div>
                        <Share2Icon className={cn('h-4 w-4', isMobile && 'text-white')}
                                    onClick={() => setSharerOpen(true)}/>
                    </div>
                }

                {!isMobile &&
                    <div className={'w-10 bg-[#1E1F22] flex flex-col items-center border'}>
                        <div className={'flex-grow py-4 space-y-6 cursor-pointer'}>
                            <div title="搜索终端内容">
                                <SearchIcon className={clsx('h-4 w-4', searchOpen && 'text-blue-500')}
                                            onClick={() => setSearchOpen(!searchOpen)}
                                />
                            </div>
                            <Share2Icon className={'h-4 w-4'} onClick={() => setSharerOpen(true)}/>
                            <FolderIcon className={'h-4 w-4'} onClick={() => {
                                setFileSystemOpen(true);
                                setPreFileSystemOpen(true);
                            }}/>
                            <ActivityIcon className={clsx('h-4 w-4', statsOpen && 'text-blue-500')}
                                          onClick={() => setStatsOpen(!statsOpen)}
                            />
                            <FolderCode className={'h-4 w-4'} onClick={() => setSnippetOpen(true)}/>
                            {shellAssistantEnabled && (
                                <BotIcon className={'h-4 w-4'} onClick={() => setShellAssistantOpen(true)}/>
                            )}
                        </div>
                    </div>
                }
            </div>

            <SnippetSheet
                onClose={() => setSnippetOpen(false)}
                onUse={(content: string) => {
                    terminalRef.current?.paste(content);
                    websocket?.send(new Message(MessageTypeData, '\r').toString());
                }}
                open={snippetOpen}
                mask={false}
            />
            <ShellAssistantSheet
                onClose={() => setShellAssistantOpen(false)}
                onExecute={(content: string) => {
                    terminalRef.current?.paste(content);
                    websocket?.send(new Message(MessageTypeData, '\r').toString());
                }}
                open={shellAssistantOpen}
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