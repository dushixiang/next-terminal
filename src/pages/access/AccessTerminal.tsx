import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Terminal} from "@xterm/xterm";
import {FitAddon} from "@xterm/addon-fit";
import {SearchAddon} from "@xterm/addon-search";
import {WebglAddon} from "@xterm/addon-webgl";
import {CanvasAddon} from "@xterm/addon-canvas";
import "@xterm/xterm/css/xterm.css";
import portalApi, {ExportSession} from "@/api/portal-api";
import {
    Message,
    MessageTypeAuthPrompt,
    MessageTypeAuthReply,
    MessageTypeData,
    MessageTypeDirChanged,
    MessageTypeError,
    MessageTypeExit,
    MessageTypeJoin,
    MessageTypeKeepAlive,
    MessageTypePing,
    MessageTypeResize
} from "@/pages/access/Terminal";
import {useInterval, useWindowSize} from "react-use";
import {CleanTheme, useTerminalTheme} from "@/pages/access/hooks/use-terminal-theme";
import {useAccessTab} from "@/pages/access/hooks/use-access-tab";
import {
    ActivityIcon,
    BotIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    EraserIcon,
    FolderCode,
    FolderIcon,
    SearchIcon,
    Share2Icon,
    XIcon
} from "lucide-react";
import SnippetSheet from "@/pages/access/SnippetSheet";
import SessionSharerModal from "@/pages/access/SessionSharerModal";
import ShellAssistantSheet from "@/pages/access/ShellAssistantSheet";
import AccessStats from "@/pages/access/AccessStats";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import clsx from "clsx";
import {debounce} from "@/utils/debounce";
import FileSystemPage from "@/pages/access/FileSystemPage";
import {App, Watermark} from "antd";
import {useAccessContentSize} from "@/pages/access/hooks/use-access-size";
import {cn} from "@/lib/utils";
import {baseWebSocketUrl} from "@/api/core/requests";
import qs from "qs";
import MultiFactorAuthentication from "@/pages/account/MultiFactorAuthentication";
import {isMac, isMobileByMediaQuery} from "@/utils/utils";
import {useTranslation} from "react-i18next";
import copy from "copy-to-clipboard";
import accessSettingApi, {Setting} from "@/api/access-setting-api";

interface Props {
    assetId: string;
    tabKey?: string;
    standalone?: boolean;
}

let _isMac = isMac();

const AccessTerminal = ({assetId, tabKey, standalone = false}: Props) => {

    let {t} = useTranslation();

    const divRef = React.useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal>(null);
    const fitRef = useRef<FitAddon>(null);
    const searchRef = useRef<SearchAddon>(null);
    const webglRef = useRef<WebglAddon>(null);
    const canvasRef = useRef<CanvasAddon>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const mobileTopControlsRef = useRef<HTMLDivElement>(null);
    const mobileBottomControlsRef = useRef<HTMLDivElement>(null);

    let websocketRef = useRef<WebSocket>(null); // 使用 ref 来存储 websocket
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
    const [pingDelay, setPingDelay] = useState<number | null>(null);

    let [reconnected, setReconnected] = useState('');
    let [contentSize] = useAccessContentSize();
    const active = standalone || accessTab === tabKey;
    let isMobile = isMobileByMediaQuery();
    const getEffectiveTerminalFontSize = (fontSize: number) => isMobile ? Math.min(fontSize, 12) : fontSize;

    let {notification, message} = App.useApp();
    const fsRef = useRef(null);

    let [mfaOpen, setMfaOpen] = useState(false);

    // 搜索相关状态
    let [searchOpen, setSearchOpen] = useState(false);
    const isSearchingRef = useRef(false);
    let [searchTerm, setSearchTerm] = useState('');
    let [searchMatchIndex, setSearchMatchIndex] = useState(0);
    let [searchMatchCount, setSearchMatchCount] = useState(0);

    // 交互式认证状态
    let [authMode, setAuthMode] = useState<'none' | 'username' | 'password'>('none');
    let [authUsername, setAuthUsername] = useState('');
    let [authPassword, setAuthPassword] = useState('');

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
        const ws = websocketRef.current;
        if (ws?.readyState === WebSocket.OPEN) {
            const timestamp = Date.now();
            ws.send(new Message(MessageTypePing, timestamp.toString()).toString());
        }
    }, 1000);

    useEffect(() => {
        if (active) {
            setTimeout(() => {
                terminalRef.current?.focus();
            }, 100);
            fitFit();
            setFileSystemOpen(preFileSystemOpen)
        } else {
            setFileSystemOpen(false);
        }
    }, [active, preFileSystemOpen]);

    useEffect(() => {
        if (accessTheme && terminalRef) {
            let options = terminalRef.current?.options;
            if (options) {
                let cleanTheme = CleanTheme(accessTheme);
                options.theme = cleanTheme?.theme?.value;
                options.fontFamily = cleanTheme.fontFamily;
                options.fontSize = getEffectiveTerminalFontSize(cleanTheme.fontSize);
                options.lineHeight = cleanTheme.lineHeight;
                setTimeout(() => fitRef.current?.fit(), 0);
            }
        }
    }, [accessTheme, isMobile]);

    useEffect(() => {
        let options = terminalRef.current?.options;
        if (options && _isMac) {
            options.macOptionIsMeta = accessSetting?.macOptionIsMeta === true;
        }
    }, [accessSetting?.macOptionIsMeta]);

    useEffect(() => {
        if (!terminalRef.current) {
            return;
        }

        let selectionChange = terminalRef.current.onSelectionChange(() => {
            // console.log(`on selection change`, accessSetting)
            if (accessSetting?.selectionCopy !== true) {
                return
            }
            // 搜索跳转时会触发 selection change，跳过避免将搜索结果自动复制
            if (isSearchingRef.current) {
                return;
            }
            if (terminalRef.current?.hasSelection()) {
                let selection = terminalRef.current?.getSelection();
                if (selection) {
                    copy(selection)
                    message.success(t('general.copy_success'));
                }
            }
        });

        const normalizeNewlines = (text: string) => text.replace(/\r\n?/g, '\n');

        const handleContextMenu = async (e: MouseEvent) => {
            // console.log(`on context menu`, accessSetting)
            if (accessSetting?.rightClickPaste !== true) {
                return
            }
            e.preventDefault();
            try {
                const clipboardText = await navigator.clipboard.readText();
                const text = normalizeNewlines(clipboardText);
                const ws = websocketRef.current;
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(new Message(MessageTypeData, text).toString());
                }
            } catch (error) {
                console.error('Failed to read clipboard:', error);
            }
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            // 只有在配置启用时才拦截搜索快捷键
            if (accessSetting?.interceptSearchShortcut !== true) {
                return;
            }

            // 支持 Ctrl+F (Windows/Linux) 和 Cmd+F (Mac)
            const isSearchShortcut = _isMac
                ? (e.metaKey && e.key === 'f')
                : (e.ctrlKey && e.key === 'f');

            if (isSearchShortcut) {
                e.preventDefault();
                setSearchOpen(true);
            }
        }

        const divElement = divRef.current;
        divElement?.addEventListener("contextmenu", handleContextMenu);
        divElement?.addEventListener("keydown", handleKeyDown);

        return () => {
            selectionChange?.dispose();
            divElement?.removeEventListener("contextmenu", handleContextMenu);
            divElement?.removeEventListener("keydown", handleKeyDown);
        };
    }, [accessSetting, terminalRef.current]);

    useEffect(() => {
        if (terminalRef.current || !divRef.current) return;

        let cleanTheme = CleanTheme(accessTheme);
        let term = new Terminal({
            theme: cleanTheme?.theme?.value,
            fontFamily: cleanTheme.fontFamily,
            fontSize: getEffectiveTerminalFontSize(cleanTheme.fontSize),
            lineHeight: cleanTheme.lineHeight,
            allowProposedApi: true,
            cursorBlink: true,
            macOptionIsMeta: _isMac && accessSetting?.macOptionIsMeta === true,
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
        if (websocketRef.current !== null) {
            return;
        }
        let session: ExportSession;
        try {
            session = await portalApi.createSessionByAssetsId(assetId, securityToken);
            setSession(session);
            if (standalone && session.assetName) {
                document.title = session.assetName;
            }
        } catch (e) {
            terminalRef.current?.writeln(`\x1b[41m ERROR \x1b[0m : ${e.message}`);
            return;
        }

        let cols = terminalRef.current.cols;
        let rows = terminalRef.current.rows;
        let params = {
            'cols': cols,
            'rows': rows,
            'sessionId': session.id,
        };

        let paramStr = qs.stringify(params);
        let websocket = new WebSocket(`${baseWebSocketUrl()}/access/terminal?${paramStr}`);

        websocket.onopen = (e => {
            terminalRef.current?.reset();
            terminalRef.current?.write('\x1b[?25h'); // 显式恢复光标可见
            setPingDelay(null);
        });

        websocket.onerror = (e) => {
            console.error(`websocket error`, e);
            terminalRef.current?.writeln(`websocket error`);
            setPingDelay(null);
            websocketRef.current = null;
        }

        websocket.onclose = (e) => {
            terminalRef.current?.reset();
            terminalRef.current?.write('\x1b[?25h'); // 显式恢复光标可见
            if (e.code === 3886) {
                terminalRef.current?.writeln('');
                terminalRef.current?.writeln('');
                terminalRef.current?.writeln(`\x1b[41m ${session.protocol.toUpperCase()} \x1b[0m ${session.assetName}: session timeout.`);
            } else {
                terminalRef.current?.writeln('');
                terminalRef.current?.writeln('');
                terminalRef.current?.writeln(`\x1b[41m ${session.protocol.toUpperCase()} \x1b[0m ${session.assetName}: session closed.`);
            }
            terminalRef.current?.writeln('Press any key to reconnect');

            setPingDelay(null);
            websocketRef.current = null;
        }

        websocket.onmessage = (e) => {
            let msg = Message.parse(e.data);
            switch (msg.type) {
                case MessageTypeError:
                    terminalRef.current.write(msg.content);
                    websocketRef?.current.close();
                    break;
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
                case MessageTypeKeepAlive:
                    websocket?.send(new Message(MessageTypePing, "").toString());
                    break;
                case MessageTypeAuthPrompt:
                    // 收到认证提示，根据内容决定提示什么
                    if (msg.content === 'password') {
                        // 只需要密码
                        terminalRef.current.write('Password: ');
                        setAuthMode('password');
                        setAuthPassword('');
                    } else {
                        // 需要用户名和密码
                        terminalRef.current.write('Username: ');
                        setAuthMode('username');
                        setAuthUsername('');
                        setAuthPassword('');
                    }
                    break;
                case MessageTypePing:
                    if (msg.content) {
                        const sentAt = parseInt(msg.content, 10);
                        if (!Number.isNaN(sentAt)) {
                            const latency = Date.now() - sentAt;
                            setPingDelay(latency >= 0 ? latency : 0);
                        }
                    }
                    break;
            }
        }
        websocketRef.current = websocket;
    }

    const connectWrap = async () => {
        let required = await portalApi.getAccessRequireMFA();
        if (required) {
            setMfaOpen(true);
        } else {
            connect();
        }
    }

    // 处理认证输入
    const handleAuthInput = (data: string) => {
        if (authMode === 'username') {
            // 输入用户名
            if (data === '\r' || data === '\n') {
                // 用户按下回车，切换到密码输入
                terminalRef.current.writeln('');
                terminalRef.current.write('Password: ');
                setAuthMode('password');
            } else if (data === '\x7f' || data === '\b') {
                // 退格键
                if (authUsername.length > 0) {
                    setAuthUsername(authUsername.slice(0, -1));
                    terminalRef.current.write('\b \b');
                }
            } else if (data >= ' ' && data <= '~') {
                // 可打印字符
                setAuthUsername(authUsername + data);
                terminalRef.current.write(data);
            }
        } else if (authMode === 'password') {
            // 输入密码
            if (data === '\r' || data === '\n') {
                // 用户按下回车，提交认证信息
                terminalRef.current.writeln('');

                // 根据是否有用户名来决定发送内容
                let authContent: string;
                if (authUsername) {
                    // 有用户名，发送 username\npassword
                    authContent = `${authUsername}\n${authPassword}`;
                } else {
                    // 只有密码，直接发送密码
                    authContent = authPassword;
                }

                // 使用 ref 获取最新的 WebSocket 连接
                const ws = websocketRef.current;
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(new Message(MessageTypeAuthReply, authContent).toString());
                } else {
                    console.error('WebSocket is not open', ws?.readyState);
                    terminalRef.current.writeln('\r\n\x1b[41m ERROR \x1b[0m : Connection lost, please try again');
                }

                // 重置认证状态
                setAuthMode('none');
                setAuthUsername('');
                setAuthPassword('');
            } else if (data === '\x7f' || data === '\b') {
                // 退格键
                if (authPassword.length > 0) {
                    setAuthPassword(authPassword.slice(0, -1));
                    terminalRef.current.write('\b \b');
                }
            } else if (data >= ' ' && data <= '~') {
                // 可打印字符，不回显
                setAuthPassword(authPassword + data);
                terminalRef.current.write('*'); // 显示星号
            }
        }
    }

    useEffect(() => {
        if (!terminalRef.current) {
            return;
        }
        setAuthMode('none');
        connectWrap();
    }, [terminalRef.current, reconnected]);

    useEffect(() => {
        let sizeListener = terminalRef.current?.onResize(function (evt) {
            // console.log(`term resize`, evt.cols, evt.rows);
            const ws = websocketRef.current;
            if (ws?.readyState === WebSocket.OPEN) {
                ws.send(new Message(MessageTypeResize, `${evt.cols},${evt.rows}`).toString());
            }
        });
        let dataListener = terminalRef.current?.onData(data => {
            // 如果处于认证模式，拦截输入用于认证
            if (authMode !== 'none') {
                handleAuthInput(data);
                return;
            }

            const ws = websocketRef.current;
            if (!ws) {
                // 忽略鼠标上报，避免鼠标移动就触发重连（残留的鼠标追踪模式可能仍在生成上报）
                if (data.startsWith('\x1b[<') || data.startsWith('\x1b[M')) return;
                setReconnected(new Date().toString());
            } else if (ws.readyState === WebSocket.OPEN) {
                ws.send(new Message(MessageTypeData, data).toString());
            }
        });

        return () => {
            sizeListener?.dispose();
            dataListener?.dispose();
        }
    }, [authMode, authUsername, authPassword]);

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
                isSearchingRef.current = true;
                const result = searchRef.current.findNext(term, {
                    caseSensitive: false, // 大小写敏感
                    wholeWord: false,
                    regex: false
                });
                isSearchingRef.current = false;
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
        isSearchingRef.current = true;
        const result = searchRef.current.findNext(searchTerm, {
            caseSensitive: false,
            wholeWord: false,
            regex: false,
            decorations: decorations,
        });
        isSearchingRef.current = false;
        if (result && searchMatchCount > 0) {
            setSearchMatchIndex(prev => prev < searchMatchCount ? prev + 1 : 1);
        }
    };

    const handleSearchPrevious = () => {
        if (!searchRef.current || !searchTerm) return;
        isSearchingRef.current = true;
        const result = searchRef.current.findPrevious(searchTerm, {
            caseSensitive: false,
            wholeWord: false,
            regex: false,
            decorations: decorations,
        });
        isSearchingRef.current = false;
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

    const handleClearTerminal = () => {
        terminalRef.current?.clear();
    };

    const [mobileViewportHeight, setMobileViewportHeight] = useState(height);
    const [mobileTerminalBodyHeight, setMobileTerminalBodyHeight] = useState<number>();
    const terminalHeight = isMobile
        ? (standalone ? height : Math.max(0, height - 77.5))
        : (standalone ? height : height - 77.5);

    useEffect(() => {
        if (!isMobile) {
            return;
        }

        const originalBodyOverflow = document.body.style.overflow;

        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalBodyOverflow;
        };
    }, [isMobile]);

    useEffect(() => {
        if (!isMobile) {
            setMobileViewportHeight(height);
            return;
        }

        const updateViewportHeight = () => {
            setMobileViewportHeight(window.visualViewport?.height || window.innerHeight);
        };

        updateViewportHeight();
        window.visualViewport?.addEventListener('resize', updateViewportHeight);
        window.visualViewport?.addEventListener('scroll', updateViewportHeight);
        window.addEventListener('resize', updateViewportHeight);

        return () => {
            window.visualViewport?.removeEventListener('resize', updateViewportHeight);
            window.visualViewport?.removeEventListener('scroll', updateViewportHeight);
            window.removeEventListener('resize', updateViewportHeight);
        };
    }, [height, isMobile]);

    useEffect(() => {
        if (isMobile) {
            fitFit();
        }
    }, [isMobile, mobileTerminalBodyHeight, mobileViewportHeight, searchOpen]);

    useEffect(() => {
        if (!isMobile) {
            setMobileTerminalBodyHeight(undefined);
            return;
        }

        const updateMobileTerminalBodyHeight = () => {
            const containerHeight = rootRef.current?.clientHeight || terminalHeight;
            const topControlsHeight = mobileTopControlsRef.current?.offsetHeight || 0;
            const bottomControlsHeight = mobileBottomControlsRef.current?.offsetHeight || 0;

            setMobileTerminalBodyHeight(Math.max(0, containerHeight - topControlsHeight - bottomControlsHeight));
        };

        updateMobileTerminalBodyHeight();

        let resizeObserver: ResizeObserver | undefined;
        if ('ResizeObserver' in window) {
            resizeObserver = new ResizeObserver(updateMobileTerminalBodyHeight);
            [rootRef.current, mobileTopControlsRef.current, mobileBottomControlsRef.current]
                .filter(Boolean)
                .forEach((element) => resizeObserver?.observe(element as Element));
        }

        window.addEventListener('resize', updateMobileTerminalBodyHeight);
        window.visualViewport?.addEventListener('resize', updateMobileTerminalBodyHeight);

        return () => {
            resizeObserver?.disconnect();
            window.removeEventListener('resize', updateMobileTerminalBodyHeight);
            window.visualViewport?.removeEventListener('resize', updateMobileTerminalBodyHeight);
        };
    }, [isMobile, searchOpen, terminalHeight]);

    const pingColorClass = pingDelay === null
        ? 'text-gray-400'
        : pingDelay < 100
            ? 'text-green-400'
            : pingDelay < 200
                ? 'text-yellow-400'
                : 'text-red-400';
    const drawerGetContainer = (standalone || isMobile) ? () => document.body : false;
    const mobileShortcutKeys = [
        {label: 'ESC', data: '\x1b', title: 'Escape'},
        {label: '⇥', data: '\x09', title: 'Tab'},
        {label: 'CTRL+B', data: '\x02', title: 'Ctrl+B'},
        {label: 'CTRL+C', data: '\x03', title: 'Ctrl+C'},
        {label: '↑', data: '\x1b[A', title: 'Arrow Up'},
        {label: '↓', data: '\x1b[B', title: 'Arrow Down'},
    ];

    const sendTerminalData = (data: string) => {
        const ws = websocketRef.current;
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(new Message(MessageTypeData, data).toString());
        }
        terminalRef.current?.focus();
    };

    const handleMobileShortcutPointerDown = (event: React.PointerEvent<HTMLButtonElement>, data: string) => {
        event.preventDefault();
        sendTerminalData(data);
    };

    const handleMobileShortcutClick = (event: React.MouseEvent<HTMLButtonElement>, data: string) => {
        if (event.detail !== 0) {
            return;
        }
        sendTerminalData(data);
    };

    const renderSearchBox = (mobile = false) => (
        <div
            className={cn(
                'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg flex items-center',
                mobile ? 'w-full min-w-0 gap-1 p-1' : 'min-w-[240px] gap-1.5 p-1.5'
            )}
        >
            <SearchIcon className="h-3.5 w-3.5 shrink-0 text-gray-500"/>
            <input
                type="search"
                inputMode="search"
                enterKeyHint="search"
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
                placeholder={t('access.settings.terminal.search_placeholder')}
                className={cn(
                    'min-w-0 flex-1 px-1.5 py-0.5 border-none outline-none bg-transparent text-gray-900 dark:text-gray-100',
                    mobile ? 'text-[11px]' : 'text-xs'
                )}
                autoFocus
            />
            {searchMatchCount > 0 && (
                <span className="shrink-0 text-[10px] text-gray-500 whitespace-nowrap">
                    {searchMatchIndex}/{searchMatchCount}
                </span>
            )}
            <div className="flex shrink-0 items-center gap-0.5">
                <button
                    type="button"
                    onClick={handleSearchPrevious}
                    disabled={!searchTerm || searchMatchCount === 0}
                    className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronUpIcon className="h-3 w-3"/>
                </button>
                <button
                    type="button"
                    onClick={handleSearchNext}
                    disabled={!searchTerm || searchMatchCount === 0}
                    className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronDownIcon className="h-3 w-3"/>
                </button>
                <button
                    type="button"
                    onClick={clearSearch}
                    className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                    <XIcon className="h-3 w-3"/>
                </button>
            </div>
        </div>
    );

    return (
        <div
            ref={rootRef}
            className={cn(
                'relative overflow-hidden',
                standalone ? 'h-svh w-screen' : 'h-full w-full',
            )}
            style={!isMobile ? undefined : standalone ? undefined : {height: terminalHeight}}
        >
            <div className={cn(
                'flex min-h-0 w-full',
                isMobile && 'h-full',
                !isMobile && 'h-full',
            )}
            >
                <ResizablePanelGroup direction="horizontal" className="min-h-0">
                    <ResizablePanel order={1} className="h-full min-w-0" onResize={(curr, prev) => {
                        fitFit();
                    }}>
                        <Watermark content={session?.watermark?.content}
                                   font={{
                                       color: session?.watermark?.color,
                                       fontSize: session?.watermark?.size,
                                   }}
                                   zIndex={session?.watermark?.enabled ? 9 : -1}
                                   style={{
                                       background: 'transparent',
                                       height: '100%',
                                   }}
                        >
                            <div className={'flex min-h-0 flex-col overflow-hidden transition duration-100'}
                                 style={{
                                     height: isMobile ? '100%' : terminalHeight,
                                 }}
                            >
                                {isMobile && (
                                    <div
                                        ref={mobileTopControlsRef}
                                        className="shrink-0 border-b border-white/10 bg-[#1E1F22] px-1.5 py-1 text-white"
                                    >
                                        <div className="flex h-8 items-center gap-1.5">
                                            <div
                                                className="flex shrink-0 items-center gap-1 rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-gray-200 shadow"
                                            >
                                                <span>Ping</span>
                                                <span className={clsx('font-semibold', pingColorClass)}>
                                                    {pingDelay === null ? '--' : `${pingDelay} ms`}
                                                </span>
                                            </div>
                                            <div className="ml-auto flex shrink-0 items-center gap-1">
                                                <button
                                                    type="button"
                                                    title={t('access.terminal.search')}
                                                    className={cn(
                                                        'flex h-7 w-7 items-center justify-center rounded bg-white/10 text-white transition-colors active:bg-white/20',
                                                        searchOpen && 'text-blue-400'
                                                    )}
                                                    onClick={() => setSearchOpen(!searchOpen)}
                                                >
                                                    <SearchIcon className="h-4 w-4"/>
                                                </button>
                                                <button
                                                    type="button"
                                                    title={t('access.terminal.clear')}
                                                    className="flex h-7 w-7 items-center justify-center rounded bg-white/10 text-white transition-colors active:bg-white/20"
                                                    onClick={handleClearTerminal}
                                                >
                                                    <EraserIcon className="h-4 w-4"/>
                                                </button>
                                                <button
                                                    type="button"
                                                    title={t('access.session.share.action')}
                                                    className="flex h-7 w-7 items-center justify-center rounded bg-white/10 text-white transition-colors active:bg-white/20"
                                                    onClick={() => setSharerOpen(true)}
                                                >
                                                    <Share2Icon className="h-4 w-4"/>
                                                </button>
                                                <button
                                                    type="button"
                                                    title="FileSystem"
                                                    className="flex h-7 w-7 items-center justify-center rounded bg-white/10 text-white transition-colors active:bg-white/20"
                                                    onClick={() => {
                                                        setFileSystemOpen(true);
                                                        setPreFileSystemOpen(true);
                                                    }}
                                                >
                                                    <FolderIcon className="h-4 w-4"/>
                                                </button>
                                                <button
                                                    type="button"
                                                    title={t('menus.resource.submenus.snippet')}
                                                    className="flex h-7 w-7 items-center justify-center rounded bg-white/10 text-white transition-colors active:bg-white/20"
                                                    onClick={() => setSnippetOpen(true)}
                                                >
                                                    <FolderCode className="h-4 w-4"/>
                                                </button>
                                                {shellAssistantEnabled && (
                                                    <button
                                                        type="button"
                                                        title={t('access.shell_assistant.title')}
                                                        className="flex h-7 w-7 items-center justify-center rounded bg-white/10 text-white transition-colors active:bg-white/20"
                                                        onClick={() => setShellAssistantOpen(true)}
                                                    >
                                                        <BotIcon className="h-4 w-4"/>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {searchOpen && (
                                            <div className="mt-1">
                                                {renderSearchBox(true)}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className={cn(
                                    'relative min-h-0 overflow-hidden',
                                    isMobile && mobileTerminalBodyHeight !== undefined ? 'flex-none' : 'flex-1',
                                    isMobile ? 'p-1' : 'p-2'
                                )}
                                     style={{
                                         backgroundColor: accessTheme?.theme?.value['background'],
                                         height: isMobile && mobileTerminalBodyHeight !== undefined ? mobileTerminalBodyHeight : undefined,
                                     }}
                                >
                                    {!isMobile && (
                                        <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-2">
                                            <div
                                                className="flex items-center gap-1 rounded bg-white/80 px-2 py-1 text-[11px] text-gray-700 shadow dark:bg-black/60 dark:text-gray-200"
                                            >
                                                <span>Ping</span>
                                                <span className={clsx('font-semibold', pingColorClass)}>
                                                    {pingDelay === null ? '--' : `${pingDelay} ms`}
                                                </span>
                                            </div>
                                            {searchOpen && renderSearchBox()}
                                        </div>
                                    )}
                                    <div className={'h-full min-h-0 w-full overflow-hidden'} ref={divRef}/>
                                </div>

                                {isMobile && (
                                    <div
                                        ref={mobileBottomControlsRef}
                                        className="shrink-0 border-t border-white/10 bg-[#1b1b1b] px-1.5 py-1"
                                        style={{paddingBottom: 'max(env(safe-area-inset-bottom), 4px)'}}
                                    >
                                        <div className="grid grid-cols-6 gap-1">
                                            {mobileShortcutKeys.map((item) => (
                                                <button
                                                    key={item.title}
                                                    type="button"
                                                    title={item.title}
                                                    className="flex h-8 min-w-0 items-center justify-center rounded bg-white/10 px-1 text-center text-[10px] font-medium leading-none text-white transition-colors active:bg-white/20"
                                                    onPointerDown={(event) => handleMobileShortcutPointerDown(event, item.data)}
                                                    onClick={(event) => handleMobileShortcutClick(event, item.data)}
                                                >
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
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

                {!isMobile &&
                    <div className={'w-10 bg-[#1E1F22] flex flex-col items-center border'}>
                        <div className={'flex-grow py-4 space-y-6 cursor-pointer'}>
                            <div title={t('access.terminal.search')}>
                                <SearchIcon className={clsx('h-4 w-4', searchOpen && 'text-blue-500')}
                                            onClick={() => setSearchOpen(!searchOpen)}
                                />
                            </div>
                            <div title={t('access.terminal.clear')}>
                                <EraserIcon className={'h-4 w-4'} onClick={handleClearTerminal}/>
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
                    const ws = websocketRef.current;
                    if (ws?.readyState === WebSocket.OPEN) {
                        ws.send(new Message(MessageTypeData, '\r').toString());
                    }
                }}
                open={snippetOpen}
                mask={false}
                getContainer={drawerGetContainer}
            />
            <ShellAssistantSheet
                onClose={() => setShellAssistantOpen(false)}
                onExecute={(content: string) => {
                    terminalRef.current?.paste(content);
                    const ws = websocketRef.current;
                    if (ws?.readyState === WebSocket.OPEN) {
                        ws.send(new Message(MessageTypeData, '\r').toString());
                    }
                }}
                open={shellAssistantOpen}
                mask={false}
                getContainer={drawerGetContainer}
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
                            getContainer={drawerGetContainer}
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
