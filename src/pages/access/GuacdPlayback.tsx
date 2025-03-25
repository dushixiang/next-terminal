import React, {useEffect, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
// @ts-ignore
import Guacamole from '@dushixiang/guacamole-common-js';
import {baseUrl, getToken} from "@/src/api/core/requests";
import times from '@/src/components/time/times';
import {useTranslation} from "react-i18next";
import strings from "@/src/utils/strings";
import './GuacdPlayback.css';
import {ConfigProvider, Select, Slider, theme} from "antd";
import {Pause, Play} from "lucide-react";

let started = false;

const GuacdPlayback = () => {

    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('sessionId');
    const token = searchParams.get('token');

    let {t} = useTranslation();

    let [position, setPosition] = useState('00:00');
    let [duration, setDuration] = useState('00:00');
    let [percent, setPercent] = useState(0);
    let [max, setMax] = useState(0);
    let [speed, setSpeed] = useState(1.0);

    let [recording, setRecording] = useState<Guacamole.SessionRecording>();

    let [playing, setPlaying] = useState(false);
    let [opacity, setOpacity] = useState(0);

    useEffect(() => {
        let recording = init(sessionId);

        return () => {
            if (recording) {
                recording.disconnect();
                recording.getDisplay().getElement().innerHTML = '';
            }
        }
    }, [sessionId]);

    const init = (sessionId: string) => {
        let authToken = getToken();
        if (strings.hasText(token)) {
            authToken = token;
        }
        let url = `${baseUrl()}/admin/sessions/${sessionId}/recording?X-Auth-Token=${authToken}`;
        const tunnel = new Guacamole.StaticHTTPTunnel(url);
        const recording = new Guacamole.SessionRecording(tunnel);

        const recordingDisplay = recording.getDisplay();

        const display = document.getElementById('display');
        display.appendChild(recordingDisplay.getElement());
        recording.onload = function () {
            console.log(`onload`);
            // 自动播放还得调整一下
            // togglePlayPause(recording);
        };
        recording.onplay = () => {
            setPlaying(true);
        }
        recording.onpause = () => {
            setPlaying(false);
        }

        // Fit display within containing div
        recordingDisplay.onresize = function displayResized(width, height) {

            let scale = Math.min(
                window.innerHeight / display.offsetHeight,
                window.innerWidth / display.offsetWidth
            );
            recordingDisplay.scale(scale);
            //
            // let scale = Math.min(display.offsetWidth / width, display.offsetHeight / height);
            // // Scale display to fit width of container
            // recordingDisplay.scale(scale);
        };

        recording.connect();

        recording.onseek = (millis) => {
            setPercent(millis);
            setPosition(times.formatTime(millis));
        };

        recording.onprogress = (millis) => {
            setMax(millis);
            setDuration(times.formatTime(millis));
        };

        setRecording(recording);
        return recording;
    }

    let timer;
    const startSpeedUp = () => {
        stopSpeedUp();
        if (speed === 1) {
            return;
        }
        if (!recording.isPlaying()) {
            return;
        }
        const add_time = 100;
        let delay = 1000 / (1000 / add_time) / (speed - 1);

        let max = recording.getDuration();
        let current = recording.getPosition();
        if (current >= max) {
            return;
        }
        recording.seek(current + add_time, () => {
            timer = setTimeout(startSpeedUp, delay);
        });
    }

    const stopSpeedUp = () => {
        if (timer) {
            clearTimeout(timer)
        }
    }

    const togglePlayPause = (self?: Guacamole.SessionRecording) => {
        if (self) {
            recording = self;
        }
        started = true;
        if (percent === max) {
            // 重播
            setPercent(0);
            recording.seek(0, () => {
                recording.play();
                startSpeedUp();
            });
        }

        if (!recording.isPlaying()) {
            console.log(`play`);
            recording.play();
            startSpeedUp();
        } else {
            console.log(`pause`);
            recording.pause();
            // stopSpeedUp();
        }
    }

    const handleProgressChange = (value: number) => {
        // Request seek
        recording.seek(value, () => {
            console.log('complete');
        });
    }

    const renderPlayButton = (className: string) => {
        if (playing) {
            return <Pause className={className} onClick={() => togglePlayPause()}/>
        } else {
            return <Play className={className} onClick={() => togglePlayPause()}/>
        }
    }

    const handleMouseMove = () => {
        setOpacity(1);
        // hide()
    }

    const handleMouseLeave = () => {
        setOpacity(0);
    }

    return (
        <div>
            <div
                style={{
                    backgroundColor: '#1b1b1b'
                }}
                className={'h-screen w-screen flex items-center justify-center'}
            >
                <div id="display" onClick={() => {
                    // togglePlayPause()
                }}>

                </div>
            </div>
            {!playing && !started && (
                <div className="fixed top-0 left-0 w-full h-full bg-gray-500 z-50 flex justify-center items-center">
                    {renderPlayButton('h-40 w-40 cursor-pointer')}
                </div>
            )}

            <div className={'fixed bottom-0 left-0 right-0 h-[32px] flex gap-4 items-center px-2 ctrl-bar'}
                 style={{opacity: opacity}}
                 onMouseMove={handleMouseMove}
                 onMouseLeave={handleMouseLeave}
            >
                <div className={'flex-none'}>
                    {renderPlayButton('h-4 w-4 cursor-pointer')}
                </div>
                <div className={'flex-auto'}>
                    <Slider value={percent}
                            max={max}
                            onChange={handleProgressChange}
                            tooltip={{
                                // open: false,
                                formatter: (millis) => {
                                    return times.formatTime(millis)
                                }
                            }}
                            styles={{
                                track: {
                                    // backgroundColor: '#1b1b1b'
                                }
                            }}
                    />
                </div>
                <div className={'flex-none'}>
                    <ConfigProvider theme={{
                        algorithm: theme.darkAlgorithm,
                    }}>
                        <Select size={'small'}
                                defaultValue={1}
                                value={speed}
                                onChange={(value) => {
                                    setSpeed(value);
                                    if (value === 1) {
                                        stopSpeedUp();
                                    } else {
                                        startSpeedUp();
                                    }
                                }}
                                options={[
                                    { value: 1, label: '1.0' },
                                    { value: 1.5, label: '1.5' },
                                    { value: 2, label: '2.0' },
                                    { value: 5, label: '5.0' },
                                ]}
                        >
                        </Select>
                    </ConfigProvider>
                </div>
                <div className={'flex-none text-xs text-white'}>
                    <b>{position}</b> / <b>{duration}</b>
                </div>
            </div>
        </div>
    );
};

export default GuacdPlayback;