import React, {useEffect, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
// @ts-ignore
import Guacamole from '@dushixiang/guacamole-common-js';
import {baseWebSocketUrl, getToken} from "@/src/api/core/requests";
import {debounce} from "@/src/utils/debounce";
import qs from "qs";
import strings from "@/src/utils/strings";
import {GuacamoleStatus} from "@/src/pages/access/guacamole/ErrorAlert";
import RenderState from "@/src/pages/access/guacamole/RenderState";

const GuacdMonitor = () => {

    const [searchParams, _] = useSearchParams();
    const sessionId = searchParams.get('sessionId');
    const token = searchParams.get('token');

    let [state, setState] = useState<number>();
    let [status, setStatus] = useState<GuacamoleStatus>();
    let [tunnelState, setTunnelState] = useState<number>();

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

    const init = (sessionId: string) => {
        let tunnel = new Guacamole.WebSocketTunnel(`${baseWebSocketUrl()}/admin/sessions/${sessionId}/graphics-monitor`);
        let client = new Guacamole.Client(tunnel);

        tunnel.onstatechange = setTunnelState;
        client.onstatechange = setState;
        client.onerror = setStatus

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
        <div className={'h-screen w-screen overflow-hidden flex items-center justify-center relative bg-[#1b1b1b]'}>
            <RenderState
                state={state}
                status={status}
                tunnelState={tunnelState}
                overlay={true}
            />
            <div id="display"/>
        </div>
    );
};

export default GuacdMonitor;