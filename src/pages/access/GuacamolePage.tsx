import React, {useEffect, useRef, useState} from 'react';
// @ts-ignore
import Guacamole from "@dushixiang/guacamole-common-js";
import {useWindowSize} from "react-use";
import useWindowFocus from "@/pages/access/hooks/use-window-focus";
import {debounce} from "@/utils/debounce";
import {isFullScreen} from "@/utils/utils";
import portalApi, {ExportSession} from "@/api/portal-api";
import {baseWebSocketUrl} from "@/api/core/requests";
import qs from "qs";
import {GuacamoleStatus} from "@/pages/access/guacamole/ErrorAlert";
import {useSearchParams} from "react-router-dom";
import {maybe} from "@/utils/maybe";
import RenderState from "@/pages/access/guacamole/RenderState";
import {duplicateKeys} from "@/pages/access/guacamole/keys";

const GuacamolePage = () => {

    const [searchParams] = useSearchParams();
    let token = maybe(searchParams.get('token'), '');
    let sharer = maybe(searchParams.get('sharer'), false);
    let sessionId = searchParams.get('sessionId');

    const terminalRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    let clientRef = useRef<Guacamole.Client>(null);
    let sinkRef = useRef<Guacamole.InputSink>(null);
    let keyboardRef = useRef<Guacamole.Keyboard>(null);

    let {width, height} = useWindowSize();
    let [displaySize, setDisplaySize] = useState([0, 0]);

    let [state, setState] = useState<number>();
    let [status, setStatus] = useState<GuacamoleStatus>();
    let [tunnelState, setTunnelState] = useState<number>();

    let windowFocus = useWindowFocus();

    useEffect(() => {
        if (windowFocus) {

        } else {
            keyboardRef.current?.reset();
        }
    }, [windowFocus]);

    // 集中处理 resize + scale
    const handleResize = () => {
        const container = isFullScreen()
            ? {width: window.innerWidth, height: window.innerHeight}
            : {width: containerRef.current?.offsetWidth ?? 0, height: containerRef.current?.offsetHeight ?? 0};
        if (container.width === 0 || container.height === 0) return;

        const display = clientRef.current?.getDisplay();
        const dw = display?.getWidth();
        const dh = display?.getHeight();

        if (dw !== container.width || dh !== container.height) {
            display?.onresize(container.width, container.height);
        }

        if (dw && dh) {
            const scale = Math.min(container.width / dw, container.height / dh);
            display.scale(scale);
        }
    };

    const debouncedResize = debounce(handleResize, 500);

    useEffect(() => {
        debouncedResize();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width, height, displaySize]);

    const getContainerSize = () => (
        isFullScreen()
            ? {width: window.innerWidth, height: window.innerHeight}
            : {width: containerRef.current?.offsetWidth ?? 0, height: containerRef.current?.offsetHeight ?? 0}
    );

    const connect = (session: ExportSession) => {

        let tunnel = new Guacamole.WebSocketTunnel(`${baseWebSocketUrl()}/access/graphics`);
        let client = new Guacamole.Client(tunnel);

        tunnel.onstatechange = setTunnelState;
        client.onstatechange = setState;
        client.onerror = setStatus

        const displayEle = terminalRef.current;
        if (displayEle) {
            while (displayEle.firstChild) {
                displayEle.removeChild(displayEle.firstChild);
            }
        }
        const element = client.getDisplay().getElement();
        displayEle?.appendChild(element);

        let display = client.getDisplay();
        display.onresize = function (w: number, h: number) {
            setDisplaySize([w, h]);
        }

        const sink = new Guacamole.InputSink();
        let sinkElement = sink.getElement();
        // 修复粘贴问题
        sinkElement.addEventListener("paste", function (e) {
            // 阻止浏览器默认的按键拆分
            e.preventDefault();
        })
        element.appendChild(sinkElement);

        const keyboard = new Guacamole.Keyboard(document);

        function shouldFilterRepeat(keysym: number): boolean {
            const twin = duplicateKeys.get(keysym);
            return twin !== undefined && keyboard.pressed[twin];
        }

        function handleKeyEvent(pressed: boolean, keysym: number): boolean {
            if (shouldFilterRepeat(keysym)) return false;

            // console.log(pressed ? 'keydown' : 'keyup', keysym, JSON.stringify(keyboard.pressed));
            client.sendKeyEvent(pressed ? 1 : 0, keysym);

            if (keysym === 65288) return false; // 65288 = Backspace

            return true;
        }

        keyboard.onkeydown = keysym => handleKeyEvent(true, keysym);
        keyboard.onkeyup = keysym => handleKeyEvent(false, keysym);
        keyboardRef.current = keyboard;

        const mouse = new Guacamole.Mouse(element);

        // @ts-ignore
        mouse.onmousedown = mouse.onmouseup = function (mouseState) {
            client.sendMouseState(mouseState);
            sink.focus();
        }

        // @ts-ignore
        mouse.onmousemove = function (mouseState) {
            mouseState.x = mouseState.x / display.getScale();
            mouseState.y = mouseState.y / display.getScale();
            client.sendMouseState(mouseState);
        };

        const touch = new Guacamole.Mouse.Touchpad(element); // or Guacamole.Touchscreen
        // @ts-ignore
        touch.onmousedown = touch.onmousemove = touch.onmouseup = function (state: any) {
            client.sendMouseState(state);
        };

        let dpi = 96 * 2;
        let {width, height} = getContainerSize();
        let params = {
            'width': width,
            'height': height,
            'dpi': dpi,
            'sessionId': session.id,
            'X-Auth-Token': token,
            'sharer': sharer,
        };

        let paramStr = qs.stringify(params);
        client.connect(paramStr);

        clientRef.current = client;
        sinkRef.current = sink;

        // console.log(`init client success`)
    }

    useEffect(() => {
        portalApi.getSessionById(sessionId)
            .then((session) => {
                connect(session);
            })
            .catch((e) => {
                setStatus({
                    code: e.code,
                    message: e.message
                })
            })
    }, []);

    return (
        <div className={'bg-[#1b1b1b] overflow-hidden'}
             style={{
                 width: width,
                 height: height,
             }}
             ref={containerRef}>
            <RenderState
                state={state}
                status={status}
                tunnelState={tunnelState}
            />
            <div className={'flex items-center justify-center'}>
                <div className={''}
                     ref={terminalRef}
                />
            </div>
        </div>
    );
};

export default GuacamolePage;