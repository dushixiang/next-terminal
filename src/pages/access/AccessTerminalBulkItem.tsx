import i18n from '@/react-i18next/i18n';
import eventEmitter from '@/api/core/event-emitter';
import {baseWebSocketUrl} from '@/api/core/requests';
import {type ExportSession} from '@/api/portal-api';
import {CleanTheme, useTerminalTheme} from '@/pages/access/hooks/use-terminal-theme';
import {useAccessSessionMutation} from '@/pages/access/hooks/use-access-session';
import {Message, MessageTypeData} from '@/pages/access/Terminal';
import {normalizeTerminalBackspace} from '@/pages/access/terminal-backspace';
import {TerminalRuntime} from '@/pages/access/terminal/terminal-runtime';
import {Popconfirm} from 'antd';
import {clsx} from 'clsx';
import {XIcon} from 'lucide-react';
import qs from 'qs';
import {useEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';

interface Props {
    assetId: string;
    securityToken?: string;
    tabId: string;
    onClose?: () => void;
}

const AccessTerminalBulkItem = ({assetId, securityToken, tabId, onClose}: Props) => {
    const {t} = useTranslation();
    const terminalElementRef = useRef<HTMLDivElement>(null);
    const runtimeRef = useRef<TerminalRuntime>(null);
    const sessionRef = useRef<ExportSession>(undefined);
    const connectingRef = useRef(false);
    const [accessTheme] = useTerminalTheme();
    const sessionMutation = useAccessSessionMutation({type: 'asset', assetId});
    const [isFocus, setIsFocus] = useState(false);
    const [session, setSession] = useState<ExportSession>();

    const connect = async () => {
        const runtime = runtimeRef.current;
        if (!runtime || connectingRef.current || runtime.socket) {
            return;
        }
        connectingRef.current = true;
        try {
            const nextSession = await sessionMutation.mutateAsync(securityToken ?? '');
            if (runtimeRef.current !== runtime) {
                return;
            }
            sessionRef.current = nextSession;
            setSession(nextSession);
            const params = qs.stringify({
                cols: runtime.terminal.cols,
                rows: runtime.terminal.rows,
                sessionId: nextSession.id,
            });
            runtime.terminal.writeln(i18n.t('access.terminal.connecting'));
            runtime.connect(`${baseWebSocketUrl()}/access/terminal?${params}`, {
                onError: () => runtime.terminal.writeln(i18n.t('access.terminal.connection_error')),
                onMessage: (event) => {
                    const message = Message.parse(event.data);
                    if (message.type === MessageTypeData) {
                        runtime.terminal.write(message.content);
                    }
                },
                onClose: (event) => {
                    const reason = event.code === 3886 ? 'session timeout.' : 'session closed.';
                    runtime.terminal.writeln('');
                    runtime.terminal.writeln('');
                    runtime.terminal.writeln(
                        `\x1b[41m ${nextSession.protocol.toUpperCase()} \x1b[0m ${nextSession.assetName}: ${reason}`,
                    );
                    runtime.terminal.writeln('Press any key to reconnect');
                },
            });
        } catch (error) {
            if (runtimeRef.current === runtime) {
                const message = error instanceof Error ? error.message : String(error);
                runtime.terminal.writeln(`\x1b[41m ERROR \x1b[0m : ${message}`);
            }
        } finally {
            connectingRef.current = false;
        }
    };

    useEffect(() => {
        const element = terminalElementRef.current;
        if (!element) {
            return;
        }
        const cleanTheme = CleanTheme(accessTheme);
        const runtime = new TerminalRuntime({
            container: element,
            terminalOptions: {
                theme: cleanTheme.theme?.value,
                fontFamily: cleanTheme.fontFamily,
                fontSize: cleanTheme.fontSize,
                lineHeight: cleanTheme.lineHeight,
            },
            configureTerminal: (terminal) => {
                terminal.attachCustomKeyEventHandler((event) => {
                    if (event.ctrlKey && event.key === 'c' && terminal.hasSelection()) {
                        return false;
                    }
                    return !(event.ctrlKey && event.key === 'v');
                });
            },
        });
        runtimeRef.current = runtime;
        const textarea = runtime.terminal.textarea;
        const handleFocus = () => setIsFocus(true);
        const handleBlur = () => setIsFocus(false);
        textarea?.addEventListener('focus', handleFocus);
        textarea?.addEventListener('blur', handleBlur);
        runtime.setInputHandler((data, currentRuntime) => {
            if (!currentRuntime.socket) {
                void connect();
                return;
            }
            currentRuntime.sendMessage(
                MessageTypeData,
                normalizeTerminalBackspace(data, sessionRef.current),
            );
        });
        runtime.focus();
        void connect();

        return () => {
            runtimeRef.current = null;
            textarea?.removeEventListener('focus', handleFocus);
            textarea?.removeEventListener('blur', handleBlur);
            runtime.dispose();
        };
    }, [assetId, securityToken]);

    useEffect(() => {
        const runtime = runtimeRef.current;
        if (!runtime) {
            return;
        }
        const cleanTheme = CleanTheme(accessTheme);
        runtime.terminal.options.theme = cleanTheme.theme?.value;
        runtime.terminal.options.fontFamily = cleanTheme.fontFamily;
        runtime.terminal.options.fontSize = cleanTheme.fontSize;
        runtime.terminal.options.lineHeight = cleanTheme.lineHeight;
        runtime.fit();
    }, [accessTheme]);

    useEffect(() => {
        const eventName = `WS:MESSAGE:${tabId}`;
        const handleMessage = (command: string) => {
            const runtime = runtimeRef.current;
            if (!runtime?.connected) {
                return;
            }
            const message = command === '\r' ? command : `${command}\r`;
            runtime.sendMessage(MessageTypeData, message);
            runtime.terminal.scrollToBottom();
        };
        eventEmitter.on(eventName, handleMessage);
        return () => eventEmitter.off(eventName, handleMessage);
    }, [tabId]);

    return (
        <div className={clsx(
            'rounded-lg border shadow-sm',
            isFocus ? 'border-blue-500 shadow-md shadow-blue-500/20' : 'border-gray-700',
        )}>
            <div className="flex items-center justify-between rounded-t-lg border-b border-gray-700 bg-gray-800/50 px-3 py-2">
                <div className="min-w-0 flex-1 truncate text-sm font-medium text-gray-200">
                    {session?.assetName || t('access.terminal.connecting')}
                </div>
                <Popconfirm
                    title={t('access.terminal.close_title')}
                    description={t('access.terminal.close_confirm')}
                    onConfirm={() => {
                        runtimeRef.current?.closeSocket();
                        onClose?.();
                    }}
                >
                    <XIcon className="ml-2 h-4 w-4 shrink-0 cursor-pointer text-gray-400 hover:text-red-400"/>
                </Popconfirm>
            </div>
            <div
                ref={terminalElementRef}
                className="rounded-b-lg p-2"
                style={{background: accessTheme?.theme?.value.background}}
            />
        </div>
    );
};

export default AccessTerminalBulkItem;
