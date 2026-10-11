import i18n from '@/react-i18next/i18n';
import {baseWebSocketUrl} from '@/api/core/requests';
import {useAccessSessionMutation} from '@/pages/access/hooks/use-access-session';
import {maybe} from '@/utils/maybe';
import strings from '@/utils/strings';
import '@xterm/xterm/css/xterm.css';
import qs from 'qs';
import {useEffect, useRef} from 'react';
import {useSearchParams} from 'react-router-dom';
import {Message, MessageTypeData} from './Terminal';
import {normalizeTerminalBackspace} from './terminal-backspace';
import {TerminalRuntime} from './terminal/terminal-runtime';

const TerminalPage = () => {
    const terminalElementRef = useRef<HTMLDivElement>(null);
    const [searchParams] = useSearchParams();
    const sharerToken = maybe(searchParams.get('sharerToken'), '');
    const sessionId = searchParams.get('sessionId') ?? '';
    const sessionMutation = useAccessSessionMutation({type: 'shared', sessionId, sharerToken});

    useEffect(() => {
        const element = terminalElementRef.current;
        if (!element) {
            return;
        }

        const runtime = new TerminalRuntime({
            container: element,
            sendResize: !strings.hasText(sharerToken),
            terminalOptions: {
                fontFamily: 'monaco, Consolas, "Lucida Console", monospace',
                fontSize: 15,
                theme: {background: '#141414'},
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
        let cancelled = false;
        runtime.terminal.writeln(i18n.t('access.terminal.connecting'));

        sessionMutation.mutateAsync().then((session) => {
            if (cancelled) {
                return;
            }
            document.title = session.assetName;
            runtime.setInputHandler((data, currentRuntime) => {
                currentRuntime.sendMessage(MessageTypeData, normalizeTerminalBackspace(data, session));
            });
            const params: Record<string, string | number> = {
                cols: runtime.terminal.cols,
                rows: runtime.terminal.rows,
                sessionId: session.id,
            };
            if (strings.hasText(sharerToken)) {
                params.sharerToken = sharerToken;
            }
            runtime.connect(`${baseWebSocketUrl()}/access/terminal?${qs.stringify(params)}`, {
                onOpen: () => runtime.terminal.clear(),
                onMessage: (event) => {
                    const message = Message.parse(event.data);
                    if (message.type === MessageTypeData) {
                        runtime.terminal.write(message.content);
                    }
                },
                onError: () => runtime.terminal.writeln(`\x1B[1;3;31m${i18n.t('access.terminal.connection_error')}\x1B[0m `),
                onClose: () => runtime.terminal.writeln(`\x1B[1;3;31m${i18n.t('access.terminal.connection_closed')}\x1B[0m `),
            });
            runtime.focus();
            window.addEventListener('beforeunload', handleUnload);
        }).catch((error) => {
            if (!cancelled) {
                runtime.terminal.writeln(`\x1B[1;3;31mget session err，${error?.message}\x1B[0m `);
            }
        });

        const handleUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
        };
        return () => {
            cancelled = true;
            window.removeEventListener('beforeunload', handleUnload);
            runtime.dispose();
        };
    }, [sessionId, sharerToken]);

    return (
        <div className="h-dvh w-screen overflow-hidden bg-[#141414]">
            <div ref={terminalElementRef} className="h-full w-full p-2"/>
        </div>
    );
};

export default TerminalPage;
