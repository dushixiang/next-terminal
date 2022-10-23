import React, {useEffect, useState} from 'react';
import {useSearchParams} from "react-router-dom";
import Guacamole from "guacamole-common-js";
import {wsServer} from "../../common/env";
import {getToken} from "../../utils/utils";
import qs from "qs";
import {debounce} from "../../utils/fun";

const STATE_IDLE = 0;
const STATE_CONNECTING = 1;
const STATE_WAITING = 2;
const STATE_CONNECTED = 3;
const STATE_DISCONNECTING = 4;
const STATE_DISCONNECTED = 5;

const GuacdMonitor = () => {

    const [searchParams, _] = useSearchParams();
    const sessionId = searchParams.get('sessionId');

    let [tip, setTip] = useState('');

    const onWindowResize = (client) => {
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

    const onClientStateChange = (state, client) => {
        switch (state) {
            case STATE_IDLE:
                setTip('正在初始化中...');
                break;
            case STATE_CONNECTING:
                setTip('正在努力连接中...');
                break;
            case STATE_WAITING:
                setTip('正在等待服务器响应...');
                break;
            case STATE_CONNECTED:
                setTip('');
                onWindowResize(client);
                break;
            case STATE_DISCONNECTING:
                setTip('会话关闭中...');
                break;
            case STATE_DISCONNECTED:
                setTip('会话已关闭');
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
            setTip('会话已关闭');
        }
    };

    const init = (sessionId) => {

        let tunnel = new Guacamole.WebSocketTunnel(`${wsServer}/sessions/${sessionId}/tunnel-monitor`);

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

        let token = getToken();

        let params = {
            'X-Auth-Token': token
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
                client.disconnect();
                client.getDisplay().getElement().innerHTML = '';
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
            <div id ='tip' style={{color: 'white', fontWeight: 'bold'}}>{tip}</div>
            <div id="display"/>
        </div>
    );
};

export default GuacdMonitor;