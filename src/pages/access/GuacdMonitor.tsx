import React, {useEffect, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
// @ts-ignore
import Guacamole from '@dushixiang/guacamole-common-js';
import {baseWebSocketUrl, getToken} from "@/src/api/core/requests";
import {debounce} from "@/src/utils/debounce";
import qs from "qs";
import strings from "@/src/utils/strings";
import {useTranslation} from "react-i18next";

const GuacdMonitor = () => {

    let {t} = useTranslation();
    const [searchParams, _] = useSearchParams();
    const sessionId = searchParams.get('sessionId');
    const token = searchParams.get('token');

    let [tip, setTip] = useState('');

    const onWindowResize = (client: Guacamole.Client) => {
        let width = client.getDisplay().getWidth();
        let height = client.getDisplay().getHeight();

        let winWidth = window.innerWidth;
        let winHeight = window.innerHeight;

        let scaleW = winWidth / width;
        let scaleH = winHeight / height;
        console.log(scaleW, scaleH)

        let scale = Math.min(scaleW, scaleH);
        if (!scale) {
            return;
        }
        client.getDisplay().scale(scale);
    };

    const onClientStateChange = (state: Guacamole.Client.State, client: Guacamole.Client) => {
        switch (state) {
            case Guacamole.Client.State.IDLE:
                setTip(t('guacd.state.idle'));
                break;
            case Guacamole.Client.State.CONNECTING:
                setTip(t('guacd.state.connecting'));
                break;
            case Guacamole.Client.State.WAITING:
                setTip(t('guacd.state.waiting'));
                break;
            case Guacamole.Client.State.CONNECTED:
                setTip('');
                onWindowResize(client);
                break;
            case Guacamole.Client.State.DISCONNECTING:
                setTip(t('guacd.state.disconnecting'));
                break;
            case Guacamole.Client.State.DISCONNECTED:
                setTip(t('guacd.state.disconnected'));
                break;
            default:
                break;
        }
    };

    const onTunnelStateChange = (state) => {
        console.log('onTunnelStateChange', state);
        if (state === Guacamole.Tunnel.State.CLOSED) {
            const display = document.getElementById("display");
            display.innerHTML = '';
            setTip(t('guacd.state.closed'));
        }
    };

    const init = (sessionId: string) => {
        let tunnel = new Guacamole.WebSocketTunnel(`${baseWebSocketUrl()}/admin/sessions/${sessionId}/graphics-monitor`);

        tunnel.onstatechange = onTunnelStateChange;
        let client = new Guacamole.Client(tunnel);

        // 处理客户端的状态变化事件
        client.onstatechange = (state) => {
            onClientStateChange(state, client);
        };
        const display = document.getElementById("display");
        display.innerHTML = '';

        // Add client to display div
        const element = client.getDisplay().getElement();
        display.appendChild(element);

        let authToken = getToken();
        if (strings.hasText(token)) {
            authToken = token;
        }

        let params = {
            'X-Auth-Token': authToken
        };

        let paramStr = qs.stringify(params);
        client.connect(paramStr);
        return client;
    }

    useEffect(() => {
        let client = init(sessionId);
        let resize = debounce(() => {
            onWindowResize(client);
        });
        client.getDisplay().onresize = resize;
        window.addEventListener('resize', resize);
        return () => {
            if (client) {
                // client.disconnect();
                // client.getDisplay().getElement().innerHTML = '';
            }
            window.removeEventListener('resize', resize);
        }
    }, [sessionId]);

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1b1b1b'
        }}>
            <div id='tip' style={{color: 'white', fontWeight: 'bold'}}>{tip}</div>
            <div id="display"/>
        </div>
    );
};

export default GuacdMonitor;