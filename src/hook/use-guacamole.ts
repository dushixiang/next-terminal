import React, {MutableRefObject, useCallback, useEffect, useRef, useState} from 'react';
import Guacamole from '@dushixiang/guacamole-common-js';
import portalApi, {ExportSession} from '@/api/portal-api';
import {baseWebSocketUrl, getToken} from '@/api/core/requests';
import qs from 'qs';

interface Options {
    assetId: string;
    terminalRef: MutableRefObject<HTMLDivElement | null>;
    onRequired?: (params: string[]) => void;
    onClipboard?: (text: string, mime: string) => void;
}

export function useGuacamole({
                                 assetId,
                                 terminalRef,
                                 onRequired,
                                 onClipboard,
                             }: Options) {

    const clientRef = useRef<Guacamole.Client>();
    const [session, setSession] = useState<ExportSession>();
    const [displaySize, setDisplaySize] = useState<[number, number]>([0, 0]);
    let [tiger, setTiger] = useState(new Date().toString());

    const [state, setState] = React.useState<Guacamole.Client.State>();
    const [status, setStatus] = React.useState<Guacamole.Status>();

    // 连接逻辑
    const _connect = useCallback(async (securityToken?: string) => {
        const sess = await portalApi.createSessionByAssetsId(assetId, securityToken);
        setSession(sess);

        const tunnel = new Guacamole.WebSocketTunnel(`${baseWebSocketUrl()}/access/graphics`);
        const client = new Guacamole.Client(tunnel);
        clientRef.current = client;

        client.onstatechange = setState;
        client.onerror = setStatus;
        if (onRequired) client.onrequired = params => onRequired([...params]);
        if (onClipboard) client.onclipboard = onClipboard;

        // 构建显示和输入
        const displayEle = terminalRef.current;
        while (displayEle?.firstChild) {
            displayEle.removeChild(displayEle.firstChild);
        }
        const display = client.getDisplay();
        display.onresize = (w, h) => setDisplaySize([w, h]);

        const element = display.getElement();
        while (element.firstChild) element.removeChild(element.firstChild);

        const sink = new Guacamole.InputSink();
        element.appendChild(sink.getElement());

        const keyboard = new Guacamole.Keyboard(sink.getElement());
        const mouse = new Guacamole.Mouse(sink.getElement());
        // …绑定键盘鼠标事件，省略

        // 发送连接参数
        const authToken = getToken();
        const params = {
            sessionId: sess.id,
            width: sess.width || window.innerWidth,
            height: sess.height || window.innerHeight,
            dpi: 192,
            'X-Auth-Token': authToken
        };
        client.connect(qs.stringify(params));
    }, [assetId, tiger]);

    // 清理
    useEffect(() => {
        _connect();
        return () => {
            clientRef.current?.disconnect();
        };
    }, []);

    const connect = (securityToken?: string) => {
        setTiger(new Date().toString());
        console.log(`tiger: ${tiger}`)
        _connect(securityToken);
    }

    // 提供外部可调用方法
    const disconnect = useCallback(() => {
        clientRef.current?.disconnect();
    }, []);

    const sendSize = useCallback((w: number, h: number) => {
        clientRef.current?.sendSize(w, h);
    }, []);

    const sendClipboard = useCallback((data: string, mime: string) => {
        if (!clientRef.current) return;
        const stream = clientRef.current.createClipboardStream(mime);
        const writer = new Guacamole.StringWriter(stream);
        writer.sendText(data);
        writer.sendEnd();
    }, []);

    return {
        session,
        displaySize,
        state,
        status,
        disconnect,
        sendSize,
        sendClipboard,
        connect,
        client: clientRef.current
    };
}
