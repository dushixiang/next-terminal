import i18n from '@/react-i18next/i18n';
import accessSettingApi from "@/api/access-setting-api";
import {baseWebSocketUrl} from "@/api/core/requests";
import portalApi, {ExportSession} from "@/api/portal-api";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {cn} from "@/lib/utils";
import {useMobile} from "@/hook/use-mobile";
import AccessStats from "@/pages/access/AccessStats";
import AIAssistant from "@/pages/ai/AIAssistant";
import FileSystemPage, {type FileSystem as FileSystemHandle} from "@/pages/access/FileSystemPage";
import {CleanTheme, useTerminalTheme} from "@/pages/access/hooks/use-terminal-theme";
import {useAccessSessionMutation} from "@/pages/access/hooks/use-access-session";
import SessionSharerModal from "@/pages/access/SessionSharerModal";
import SessionWatermark from "@/pages/access/SessionWatermark";
import SnippetSheet from "@/pages/access/SnippetSheet";
import {
    Message,
    MessageTypeAuthPrompt,
    MessageTypeAuthReply,
    MessageTypeBinaryData,
    MessageTypeData,
    MessageTypeDirChanged,
    MessageTypeError,
    MessageTypeExit,
    MessageTypeJoin,
    MessageTypePing
} from "@/pages/access/Terminal";
import {normalizeTerminalBackspace} from "@/pages/access/terminal-backspace";
import {TerminalRuntime} from "@/pages/access/terminal/terminal-runtime";
import TerminalPreConnect, {
    type TerminalAuthReply,
    type TerminalPreConnectState
} from "@/pages/access/terminal/TerminalPreConnect";
import {useMutation, useQuery} from "@tanstack/react-query";
import {ZmodemController} from "@/pages/access/lrzsz/zmodemController";
import {MOBILE_TOOL_DRAWER_SIZE} from "@/pages/access/terminal-tool-drawer";
import MultiFactorAuthentication from "@/pages/account/MultiFactorAuthentication";
import {isMac} from "@/utils/utils";
import {CanvasAddon} from "@xterm/addon-canvas";
import {SearchAddon} from "@xterm/addon-search";
import {WebglAddon} from "@xterm/addon-webgl";
import {type Terminal} from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import {App} from "antd";
import clsx from "clsx";
import copy from "copy-to-clipboard";
import {Base64} from "js-base64";
import {
    ActivityIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    EraserIcon,
    FolderCode,
    FolderIcon,
    SearchIcon,
    Share2Icon,
    SparklesIcon,
    XIcon
} from "lucide-react";
import qs from "qs";
import React, {useEffect, useRef, useState} from 'react';
import {useTranslation} from "react-i18next";
import type {PanelImperativeHandle} from "react-resizable-panels";

interface Props {
    assetId: string;
    standalone?: boolean;
    active?: boolean;
}

type MobileToolDrawer = 'ai' | 'snippet' | 'fileSystem' | null;

let _isMac = isMac();

const ANSI_DIM = '\x1b[2m';
const ANSI_RESET = '\x1b[0m';
const RESTORE_TERMINAL_STATE = [
    '\x1b[0m',
    '\x1b[?7h',
    '\x1b[?25h',
    '\x1b[?1000l',
    '\x1b[?1002l',
    '\x1b[?1003l',
    '\x1b[?1006l',
    '\x1b[?2004l',
].join('');
const LEAVE_ALTERNATE_SCREEN_BUFFER = '\x1b[?1049l';

const AccessTerminal = ({assetId, standalone = false, active: activeProp}: Props) => {

    let {t} = useTranslation();

    const divRef = React.useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal>(null);
    const runtimeRef = useRef<TerminalRuntime>(null);
    const searchRef = useRef<SearchAddon>(null);
    const zmodemControllerRef = useRef<ZmodemController>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const mobileTopControlsRef = useRef<HTMLDivElement>(null);
    const mobileBottomControlsRef = useRef<HTMLDivElement>(null);
    const toolPanelRef = useRef<PanelImperativeHandle>(null);
    const hasConnectedRef = useRef(false);
    const connectingRef = useRef(false);
    const mfaCheckingRef = useRef(false);

    let [session, setSession] = useState<ExportSession>();
    const aiEnabled = !!session;
    const restrictedShell = session?.attrs?.['restricted-shell'] === true;
    const fileSystemEnabled = session?.fileSystem === true && !restrictedShell;
    const statsEnabled = Boolean(session?.id) && !restrictedShell;

    let [accessTheme] = useTerminalTheme();
    const sessionMutation = useAccessSessionMutation({type: 'asset', assetId});
    const accessRequireMFAMutation = useMutation({mutationFn: () => portalApi.getAccessRequireMFA()});
    const {data: accessSetting} = useQuery({
        queryKey: ['access-setting'],
        queryFn: accessSettingApi.get,
    });

    let [fileSystemOpen, setFileSystemOpen] = useState(false);
    let [preFileSystemOpen, setPreFileSystemOpen] = useState(false);

    let [snippetOpen, setSnippetOpen] = useState(false);
    let [aiOpen, setAiOpen] = useState(false);
    const [aiPanelMounted, setAiPanelMounted] = useState(false);
    const [mobileToolDrawer, setMobileToolDrawer] = useState<MobileToolDrawer>(null);
    let [sharerOpen, setSharerOpen] = useState(false);
    let [statsOpen, setStatsOpen] = useState(false);
    const [statsPanelMounted, setStatsPanelMounted] = useState(false);
    const [pingDelay, setPingDelay] = useState<number | null>(null);

    let [reconnected, setReconnected] = useState('');
    const active = activeProp ?? standalone;
    const {isMobile} = useMobile();
    const getEffectiveTerminalFontSize = (fontSize: number) => isMobile ? Math.min(fontSize, 12) : fontSize;

    const fitTerminal = () => {
        runtimeRef.current?.fit();
    };

    const setDesktopAiOpen = (open: boolean) => {
        if (open) {
            setStatsOpen(false);
            toolPanelRef.current?.expand();
        } else {
            toolPanelRef.current?.collapse();
        }
        setAiOpen(open);
    };

    const setDesktopStatsOpen = (open: boolean) => {
        if (open) {
            setAiOpen(false);
            toolPanelRef.current?.expand();
        } else {
            toolPanelRef.current?.collapse();
        }
        setStatsOpen(open);
    };

    let {notification, message} = App.useApp();
    const fsRef = useRef<FileSystemHandle>(null);

    let [mfaOpen, setMfaOpen] = useState(false);

    // 搜索相关状态
    let [searchOpen, setSearchOpen] = useState(false);
    const isSearchingRef = useRef(false);
    let [searchTerm, setSearchTerm] = useState('');
    let [searchMatchIndex, setSearchMatchIndex] = useState(0);
    let [searchMatchCount, setSearchMatchCount] = useState(0);

    // 交互式认证状态:服务端 AuthPrompt 驱动的 pre-connect 面板
    let [preConnect, setPreConnect] = useState<TerminalPreConnectState | null>(null);

    useEffect(() => {
        if (!aiEnabled) {
            setAiOpen(false);
            setAiPanelMounted(false);
            setMobileToolDrawer((current) => current === 'ai' ? null : current);
        }
    }, [aiEnabled]);

    useEffect(() => {
        if (!fileSystemEnabled) {
            setFileSystemOpen(false);
            setPreFileSystemOpen(false);
            setMobileToolDrawer((current) => current === 'fileSystem' ? null : current);
        }
        if (!statsEnabled) {
            setStatsOpen(false);
            setStatsPanelMounted(false);
        }
    }, [fileSystemEnabled, statsEnabled]);

    useEffect(() => {
        if (aiOpen) {
            setAiPanelMounted(true);
        }
        if (statsOpen) {
            setStatsPanelMounted(true);
        }
    }, [aiOpen, statsOpen]);

    useEffect(() => {
        if (active) {
            setTimeout(() => {
                terminalRef.current?.focus();
            }, 100);
            fitTerminal();
            setFileSystemOpen(fileSystemEnabled && preFileSystemOpen)
        } else {
            setFileSystemOpen(false);
        }
    }, [active, fileSystemEnabled, preFileSystemOpen]);

    useEffect(() => {
        if (accessTheme && terminalRef) {
            let options = terminalRef.current?.options;
            if (options) {
                let cleanTheme = CleanTheme(accessTheme);
                options.theme = cleanTheme?.theme?.value;
                options.fontFamily = cleanTheme.fontFamily;
                options.fontSize = getEffectiveTerminalFontSize(cleanTheme.fontSize);
                options.lineHeight = cleanTheme.lineHeight;
                requestAnimationFrame(() => runtimeRef.current?.fit());
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
            if (accessSetting?.rightClickPaste !== true) {
                return
            }
            e.preventDefault();
            try {
                const clipboardText = await navigator.clipboard.readText();
                const text = normalizeNewlines(clipboardText);
                runtimeRef.current?.sendMessage(MessageTypeData, text);
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
        let webglAddon: WebglAddon | null = null;
        let canvasAddon: CanvasAddon | null = null;
        const searchAddon = new SearchAddon();
        const runtime = new TerminalRuntime({
            container: divRef.current,
            pingInterval: 1000,
            terminalOptions: {
                theme: cleanTheme?.theme?.value,
                fontFamily: cleanTheme.fontFamily,
                fontSize: getEffectiveTerminalFontSize(cleanTheme.fontSize),
                lineHeight: cleanTheme.lineHeight,
                allowProposedApi: true,
                cursorBlink: true,
                macOptionIsMeta: _isMac && accessSetting?.macOptionIsMeta === true,
                convertEol: true,
                fastScrollModifier: 'alt',
                fastScrollSensitivity: 5,
                scrollback: 10000,
                windowsMode: false,
            },
            configureTerminal: (term) => {
                term.attachCustomKeyEventHandler((domEvent) => {
                    if (domEvent.ctrlKey && domEvent.key === 'c' && term.hasSelection()) {
                        return false;
                    }
                    return !(domEvent.ctrlKey && domEvent.key === 'v');
                });
                term.loadAddon(searchAddon);
                try {
                    webglAddon = new WebglAddon();
                    term.loadAddon(webglAddon);
                } catch (error) {
                    console.warn('WebGL renderer unavailable, falling back to Canvas renderer:', error);
                    try {
                        canvasAddon = new CanvasAddon();
                        term.loadAddon(canvasAddon);
                    } catch (canvasError) {
                        console.warn('Canvas renderer unavailable, using DOM renderer:', canvasError);
                    }
                }
            },
        });

        runtimeRef.current = runtime;
        terminalRef.current = runtime.terminal;
        searchRef.current = searchAddon;
        runtime.focus();

        return () => {
            zmodemControllerRef.current?.dispose();
            zmodemControllerRef.current = null;
            runtimeRef.current = null;
            terminalRef.current = null;
            searchRef.current = null;
            runtime.dispose();
        }
    }, []);

    const onDirChanged = (dir: string) => {
        fsRef.current?.changeDir(dir);
    };

    const restoreTerminalStateForReconnect = () => {
        const terminal = terminalRef.current;
        if (!terminal) {
            return;
        }

        const restoreState = terminal.buffer.active.type === 'alternate'
            ? `${RESTORE_TERMINAL_STATE}${LEAVE_ALTERNATE_SCREEN_BUFFER}`
            : RESTORE_TERMINAL_STATE;
        terminal.write(restoreState, () => {
            terminal.scrollToBottom();
        });
    };

    const connect = async (securityToken?: string) => {
        const runtime = runtimeRef.current;
        if (!runtime || runtime.socket || connectingRef.current) {
            return;
        }
        connectingRef.current = true;
        const reconnecting = hasConnectedRef.current;
        if (reconnecting) {
            restoreTerminalStateForReconnect();
            terminalRef.current?.writeln(`\r\n${ANSI_DIM}Reconnecting...${ANSI_RESET}`);
        }
        let session: ExportSession;
        try {
            session = await sessionMutation.mutateAsync(securityToken);
            if (runtimeRef.current !== runtime) {
                return;
            }
            setSession(session);
            if (standalone && session.assetName) {
                document.title = session.assetName;
            }
        } catch (e) {
            if (runtimeRef.current === runtime) {
                const message = e instanceof Error ? e.message : String(e);
                runtime.terminal.writeln(`\x1b[41m ERROR \x1b[0m : ${message}`);
            }
            return;
        } finally {
            connectingRef.current = false;
        }

        const terminal = terminalRef.current;
        if (!terminal) {
            return;
        }

        zmodemControllerRef.current?.dispose();
        zmodemControllerRef.current = new ZmodemController({
            terminal,
            messageApi: message,
            enabled: session.protocol.toLowerCase() === 'ssh',
            disabledMessage: t('access.terminal.zmodem.ssh_only'),
            sendBytes: (data) => {
                runtime.sendMessage(MessageTypeBinaryData, Base64.fromUint8Array(data));
            },
            texts: {
                saveDialogTitle: t('access.terminal.zmodem.save_dialog_title'),
                uploadSkippedTitle: t('access.terminal.zmodem.upload_skipped_title'),
                uploadSkippedDescription: (fileName) => t('access.terminal.zmodem.upload_skipped_description', {fileName}),
                downloadCompleteTitle: t('access.terminal.zmodem.download_complete_title'),
                progressUploadingTitle: t('access.terminal.zmodem.progress_uploading_title'),
                progressDownloadingTitle: t('access.terminal.zmodem.progress_downloading_title'),
                uploadNoRzResponse: t('access.terminal.zmodem.upload_no_rz_response'),
                uploadTransferActive: t('access.terminal.zmodem.upload_transfer_active'),
                uploadNoFiles: t('access.terminal.zmodem.upload_no_files'),
            },
        });

        let cols = terminal.cols;
        let rows = terminal.rows;
        let params = {
            'cols': cols,
            'rows': rows,
            'sessionId': session.id,
        };

        const paramStr = qs.stringify(params);
        runtime.connect(`${baseWebSocketUrl()}/access/terminal?${paramStr}`, {
        onOpen: () => {
            hasConnectedRef.current = true;
            restoreTerminalStateForReconnect();
            setPingDelay(null);
        },

        onError: (e) => {
            console.error(`websocket error`, e);
            terminalRef.current?.writeln(i18n.t('access.terminal.connection_error'));
            setPingDelay(null);
        },

        onClose: (e) => {
            restoreTerminalStateForReconnect();
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
        },

        onMessage: (e) => {
            let msg = Message.parse(e.data);
            switch (msg.type) {
                case MessageTypeError:
                    terminal.write(msg.content);
                    runtime.closeSocket();
                    break;
                case MessageTypeData:
                    zmodemControllerRef.current?.consume(new TextEncoder().encode(msg.content));
                    break;
                case MessageTypeBinaryData:
                    zmodemControllerRef.current?.consume(Base64.toUint8Array(msg.content));
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
                    if (session.attrs?.['sftp-directory-follow'] !== false) {
                        onDirChanged(msg.content);
                    }
                    break;
                case MessageTypeAuthPrompt:
                    // SDK 标准认证挑战:JSON payload 决定渲染哪种面板
                    try {
                        const prompt = JSON.parse(msg.content);
                        switch (prompt.kind) {
                            case 'username':
                                setPreConnect({type: 'username', message: prompt.message, retry: prompt.retry});
                                break;
                            case 'passphrase':
                                setPreConnect({type: 'passphrase', message: prompt.message, retry: prompt.retry});
                                break;
                            case 'keyboard-interactive':
                                setPreConnect({
                                    type: 'keyboard-interactive',
                                    challenge: {
                                        name: prompt.challenge?.name,
                                        instruction: prompt.challenge?.instruction,
                                        questions: prompt.challenge?.questions ?? [],
                                        echos: prompt.challenge?.echos ?? [],
                                    },
                                    message: prompt.message,
                                    retry: prompt.retry,
                                });
                                break;
                            default:
                                setPreConnect({
                                    type: 'password',
                                    username: prompt.username ?? '',
                                    message: prompt.message,
                                    retry: prompt.retry,
                                });
                        }
                    } catch (e) {
                        console.error('failed to parse auth prompt', e);
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
        },
        });
    }

    const connectWrap = async (expectedRuntime: TerminalRuntime) => {
        if (mfaCheckingRef.current) {
            return;
        }
        mfaCheckingRef.current = true;
        try {
            const required = await accessRequireMFAMutation.mutateAsync();
            if (runtimeRef.current !== expectedRuntime) {
                return;
            }
            if (required) {
                setMfaOpen(true);
            } else {
                connect();
            }
        } finally {
            mfaCheckingRef.current = false;
        }
    }

    // 提交认证回复给服务端的建连流程
    const handleAuthSubmit = (reply: TerminalAuthReply) => {
        setPreConnect(null);
        if (!runtimeRef.current?.sendMessage(MessageTypeAuthReply, JSON.stringify(reply))) {
            setPreConnect(null);
            terminalRef.current?.writeln('\r\n\x1b[41m ERROR \x1b[0m : Connection lost, please try again');
        }
    };

    // 取消认证:关闭连接,服务端 Prompt 将感知断开并清理会话
    const handleAuthCancel = () => {
        setPreConnect(null);
        runtimeRef.current?.closeSocket();
    };

    useEffect(() => {
        const runtime = runtimeRef.current;
        if (!runtime) {
            return;
        }
        void connectWrap(runtime);
    }, [reconnected]);

    useEffect(() => {
        const runtime = runtimeRef.current;
        runtime?.setInputHandler((data) => {
            if (!runtime.socket) {
                // 忽略鼠标上报，避免鼠标移动就触发重连（残留的鼠标追踪模式可能仍在生成上报）
                if (data.startsWith('\x1b[<') || data.startsWith('\x1b[M')) return;
                setReconnected(new Date().toString());
            } else {
                runtime.sendMessage(MessageTypeData, normalizeTerminalBackspace(data, session));
            }
        });

        return () => {
            runtime?.setInputHandler();
        }
    }, [session?.attrs?.backspaceMode]);

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

    const [mobileViewportHeight, setMobileViewportHeight] = useState(() => (
        window.visualViewport?.height ?? window.innerHeight
    ));
    const [mobileTerminalBodyHeight, setMobileTerminalBodyHeight] = useState<number>();

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
    }, [isMobile]);

    useEffect(() => {
        if (isMobile) {
            fitTerminal();
        }
    }, [isMobile, mobileTerminalBodyHeight, mobileViewportHeight, searchOpen]);

    useEffect(() => {
        if (!isMobile) {
            setMobileTerminalBodyHeight(undefined);
            return;
        }

        const updateMobileTerminalBodyHeight = () => {
            const containerHeight = rootRef.current?.clientHeight ?? 0;
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
    }, [isMobile, searchOpen]);

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
        runtimeRef.current?.sendMessage(MessageTypeData, data);
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
            style={isMobile && standalone ? {height: mobileViewportHeight} : undefined}
        >
            <div className={cn(
                'flex min-h-0 w-full',
                isMobile && 'h-full',
                !isMobile && 'h-full',
            )}
            >
                <ResizablePanelGroup direction="horizontal" className="min-h-0 min-w-0 flex-1">
                    <ResizablePanel order={1} className="h-full min-w-0">
                        <div className={'relative h-full'}>
                            <div className={'flex h-full min-h-0 flex-col overflow-hidden'}>
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
                                                {aiEnabled && (
                                                    <button
                                                        type="button"
                                                        title={t('ai_assistant.title')}
                                                        className="flex h-7 w-7 items-center justify-center rounded bg-white/10 text-white transition-colors active:bg-white/20"
                                                        onClick={() => setMobileToolDrawer('ai')}
                                                    >
                                                        <SparklesIcon className="h-4 w-4"/>
                                                    </button>
                                                )}
                                                {fileSystemEnabled && (
                                                    <button
                                                        type="button"
                                                        title={t('fs.title')}
                                                        className="flex h-7 w-7 items-center justify-center rounded bg-white/10 text-white transition-colors active:bg-white/20"
                                                        onClick={() => setMobileToolDrawer('fileSystem')}
                                                    >
                                                        <FolderIcon className="h-4 w-4"/>
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    title={t('menus.resource.submenus.snippet')}
                                                    className="flex h-7 w-7 items-center justify-center rounded bg-white/10 text-white transition-colors active:bg-white/20"
                                                    onClick={() => setMobileToolDrawer('snippet')}
                                                >
                                                    <FolderCode className="h-4 w-4"/>
                                                </button>
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
                                    {preConnect && (
                                        <TerminalPreConnect
                                            state={preConnect}
                                            onSubmit={handleAuthSubmit}
                                            onCancel={handleAuthCancel}
                                        />
                                    )}
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

                            <SessionWatermark watermark={session?.watermark}/>
                        </div>
                    </ResizablePanel>
                    {!isMobile && (statsEnabled || aiEnabled) ? (
                        <>
                            <ResizableHandle withHandle className={clsx(!statsOpen && !aiOpen && 'hidden')}/>
                            <ResizablePanel
                                ref={toolPanelRef}
                                collapsible
                                collapsedSize="0px"
                                defaultSize="0px"
                                minSize="340px"
                                maxSize="640px"
                                groupResizeBehavior="preserve-pixel-size"
                                order={2}
                                id={'terminal-tool'}
                                className={'relative h-full min-h-0 overflow-hidden'}
                            >
                                {statsEnabled && (statsOpen || statsPanelMounted) ? (
                                    <div className={clsx('h-full', !statsOpen && 'hidden')} aria-hidden={!statsOpen} inert={!statsOpen}>
                                        <AccessStats sessionId={session?.id ?? ''} open={statsOpen}/>
                                    </div>
                                ) : null}
                                {aiEnabled && (aiOpen || aiPanelMounted) ? (
                                    <div className={clsx('h-full', !aiOpen && 'hidden')} aria-hidden={!aiOpen} inert={!aiOpen}>
                                        <AIAssistant
                                            embedded
                                            assetId={assetId}
                                            assetName={session?.assetName}
                                            open={Boolean(session?.id)}
                                            onClose={() => setDesktopAiOpen(false)}
                                        />
                                    </div>
                                ) : null}
                            </ResizablePanel>
                        </>
                    ) : null}

                </ResizablePanelGroup>

                {!isMobile &&
                    <div className={'w-10 shrink-0 bg-[#1E1F22] flex flex-col items-center border'}>
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
                            {aiEnabled && (
                                <SparklesIcon className={clsx('h-4 w-4', aiOpen && 'text-blue-500')}
                                              onClick={() => {
                                                  setDesktopAiOpen(!aiOpen);
                                              }}
                                />
                            )}
                            {fileSystemEnabled && (
                                <FolderIcon className={'h-4 w-4'} onClick={() => {
                                    setFileSystemOpen(true);
                                    setPreFileSystemOpen(true);
                                }}/>
                            )}
                            {statsEnabled && (
                                <ActivityIcon className={clsx('h-4 w-4', statsOpen && 'text-blue-500')}
                                              onClick={() => {
                                                  setDesktopStatsOpen(!statsOpen);
                                              }}
                                />
                            )}
                            <FolderCode className={'h-4 w-4'} onClick={() => setSnippetOpen(true)}/>
                        </div>
                    </div>
                }
            </div>

            <SnippetSheet
                onClose={() => {
                    if (isMobile) {
                        setMobileToolDrawer(null);
                    } else {
                        setSnippetOpen(false);
                    }
                }}
                onUse={(content: string) => {
                    terminalRef.current?.paste(content);
                    runtimeRef.current?.sendMessage(MessageTypeData, '\r');
                }}
                open={isMobile ? mobileToolDrawer === 'snippet' : snippetOpen}
                placement={isMobile ? 'bottom' : 'right'}
                size={isMobile ? MOBILE_TOOL_DRAWER_SIZE : 378}
                mask={false}
                getContainer={drawerGetContainer}
            />
            <SessionSharerModal sessionId={session?.id ?? ''} open={sharerOpen}
                                onClose={() => setSharerOpen(false)}/>

            {isMobile && aiEnabled && (
                <AIAssistant
                    drawer
                    drawerPlacement="bottom"
                    drawerSize={MOBILE_TOOL_DRAWER_SIZE}
                    assetId={assetId}
                    assetName={session?.assetName}
                    open={mobileToolDrawer === 'ai' && Boolean(session?.id)}
                    onClose={() => setMobileToolDrawer(null)}
                    getContainer={drawerGetContainer}
                />
            )}

            {fileSystemEnabled && (
                <FileSystemPage fsId={session?.id ?? ''}
                                strategy={session?.strategy}
                                open={isMobile ? mobileToolDrawer === 'fileSystem' : fileSystemOpen}
                                placement={isMobile ? 'bottom' : 'right'}
                                size={isMobile ? MOBILE_TOOL_DRAWER_SIZE : 720}
                                mask={false}
                                maskClosable={false}
                                onClose={() => {
                                    setMobileToolDrawer(null);
                                    setFileSystemOpen(false)
                                    setPreFileSystemOpen(false);
                                }}
                                ref={fsRef}
                                getContainer={drawerGetContainer}
                />
            )}

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
