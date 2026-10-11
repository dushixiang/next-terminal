import i18n from '@/react-i18next/i18n';
import {baseWebSocketUrl} from '@/api/core/requests';
import {Message, MessageTypeData} from '@/pages/access/Terminal';
import {TerminalRuntime} from '@/pages/access/terminal/terminal-runtime';
import {maybe} from '@/utils/maybe';
import '@xterm/xterm/css/xterm.css';
import qs from 'qs';
import {useEffect, useRef} from 'react';
import {useSearchParams} from 'react-router-dom';

const TerminalMonitor = () => {
    const [searchParams] = useSearchParams();
    const sessionId = maybe(searchParams.get('sessionId'), '');
    const terminalElementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = terminalElementRef.current;
        if (!element) {
            return;
        }
        const runtime = new TerminalRuntime({
            container: element,
            readOnly: true,
            sendResize: false,
            pingInterval: 0,
            terminalOptions: {
                fontFamily: 'monaco, Consolas, "Lucida Console", monospace',
                fontSize: 15,
                theme: {background: '#141414'},
            },
        });
        runtime.terminal.writeln(i18n.t('access.terminal.connecting'));
        const params = qs.stringify({
            cols: runtime.terminal.cols,
            rows: runtime.terminal.rows,
            sessionId,
        });
        runtime.connect(`${baseWebSocketUrl()}/admin/sessions/${sessionId}/terminal-monitor?${params}`, {
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
        return () => runtime.dispose();
    }, [sessionId]);

    return (
        <div
            ref={terminalElementRef}
            className="h-dvh w-screen overflow-hidden bg-[#141414] p-2"
        />
    );
};

export default TerminalMonitor;
