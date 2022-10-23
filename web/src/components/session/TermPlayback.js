import React, {useEffect} from 'react';
import * as AsciinemaPlayer from 'asciinema-player';
import 'asciinema-player/dist/bundle/asciinema-player.css';
import {useSearchParams} from "react-router-dom";
import {server} from "../../common/env";
import {getToken} from "../../utils/utils";

const TermPlayback = () => {

    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('sessionId');

    useEffect(() => {
        let url = `${server}/sessions/${sessionId}/recording?X-Auth-Token=${getToken()}`;
        let player = document.getElementById('player');
        AsciinemaPlayer.create(url, player, {
            cols: 144,
            rows: 32,
            terminalFontFamily: 'monaco, Consolas, "Lucida Console", monospace'
        });
    }, [sessionId]);

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            backgroundColor: '#1b1b1b'
        }}>
            <div id='player'></div>
        </div>

    );
};

export default TermPlayback;