import React, {useEffect, useRef, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
// @ts-ignore
import Guacamole from '@dushixiang/guacamole-common-js';
import {baseUrl, getToken} from "@/api/core/requests";
import times from '@/components/time/times';
import {useTranslation} from "react-i18next";
import strings from "@/utils/strings";
import './GuacdPlayback.css';
import {ConfigProvider, Select, Slider, theme, Tooltip} from "antd";
import {Pause, Play, Maximize, Minimize, SkipBack, SkipForward, Volume2, VolumeX} from "lucide-react";

Guacamole.Layer.prototype.toCanvas = function () {
    const c = this.getCanvas();
    if (!c || c.width === 0 || c.height === 0) {
        // 返回一个空白 canvas，避免报错
        const empty = document.createElement('canvas');
        empty.width = 1;
        empty.height = 1;
        return empty;
    }

    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;

    const context = canvas.getContext('2d');
    context.drawImage(c, 0, 0);

    return canvas;
};

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
    let [opacity, setOpacity] = useState(1);
    let [hasStarted, setHasStarted] = useState(false);
    let [isFullscreen, setIsFullscreen] = useState(false);
    let [volume, setVolume] = useState(1.0);
    let [isMuted, setIsMuted] = useState(false);
    let [showVolumeSlider, setShowVolumeSlider] = useState(false);

    const hideTimerRef = useRef<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const volumeTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        let recording = init(sessionId);

        // 键盘快捷键支持
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
            
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    togglePlayPause();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    seekRelative(-10000); // 后退10秒
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    seekRelative(10000); // 前进10秒
                    break;
                case 'KeyF':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
            }
        };

        // 全屏状态监听
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            if (recording) {
                recording.disconnect();
                recording.getDisplay().getElement().innerHTML = '';
            }
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
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

        console.log(recording.getDisplay().getDefaultLayer().toCanvas.toString());

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
            const container = document.getElementById('display');
            if (!container) return;
            const scale = Math.min(container.offsetWidth / width, container.offsetHeight / height);
            recordingDisplay.scale(scale);
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
        setHasStarted(true);
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

    const seekRelative = (milliseconds: number) => {
        if (!recording) return;
        const newPosition = Math.max(0, Math.min(max, percent + milliseconds));
        recording.seek(newPosition, () => {
            console.log('seek complete');
        });
    };

    const toggleFullscreen = async () => {
        if (!containerRef.current) return;
        
        try {
            if (!document.fullscreenElement) {
                await containerRef.current.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (error) {
            console.error('Fullscreen toggle failed:', error);
        }
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
        // 这里可以添加实际的音频静音逻辑
        // if (recording && recording.getAudio) {
        //     recording.getAudio().muted = !isMuted;
        // }
    };

    const handleVolumeChange = (value: number) => {
        setVolume(value);
        setIsMuted(value === 0);
        // 这里可以添加实际的音量控制逻辑
        // if (recording && recording.getAudio) {
        //     recording.getAudio().volume = value;
        // }
    };

    const handleVolumeMouseEnter = () => {
        if (volumeTimeoutRef.current) {
            clearTimeout(volumeTimeoutRef.current);
        }
        setShowVolumeSlider(true);
    };

    const handleVolumeMouseLeave = () => {
        volumeTimeoutRef.current = window.setTimeout(() => {
            setShowVolumeSlider(false);
        }, 1000);
    };

    const handleMouseMove = () => {
        setOpacity(1);
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
        }
        hideTimerRef.current = window.setTimeout(() => {
            if (hasStarted && playing) {
                setOpacity(0);
            }
        }, 3000);
    };

    const handleMouseLeave = () => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
        }
        hideTimerRef.current = window.setTimeout(() => {
            if (hasStarted && playing) {
                setOpacity(0);
            }
        }, 1000);
    };

    return (
        <div ref={containerRef}>
            <div
                className={'h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-neutral-900 to-black'}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                <div className="rounded-xl overflow-hidden ring-1 ring-white/10 shadow-2xl bg-black/20">
                    <div id="display" onClick={() => {
                        // togglePlayPause()
                    }}>
                    </div>
                </div>
            </div>
            
            {!playing && !hasStarted && (
                <div className="fixed top-0 left-0 w-full h-full bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center">
                    <div className="text-center px-4">
                        {renderPlayButton('h-16 w-16 cursor-pointer text-white md:h-28 md:w-28 mb-4')}
                        <div className="text-white/60 text-xs md:text-sm mt-4 space-y-1">
                            <div>{t('access.playback.shortcut_space')}</div>
                            <div className="hidden sm:block">{t('access.playback.shortcut_seek')}</div>
                            <div className="hidden sm:block">{t('access.playback.shortcut_fullscreen')}</div>
                        </div>
                    </div>
                </div>
            )}

            <div className={'fixed bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 w-[min(900px,98vw)] h-12 md:h-14 flex gap-1 md:gap-3 items-center px-2 md:px-4 rounded-lg md:rounded-xl bg-black/60 backdrop-blur-md border border-white/10 shadow-xl transition-opacity duration-300 ctrl-bar'}
                 style={{opacity: opacity}}
            >
                {/* 后退按钮 - 在小屏幕上隐藏 */}
                <div className={'flex-none hidden sm:block'}>
                    <Tooltip title={t('access.playback.seek_back')}>
                        <SkipBack className="h-4 w-4 cursor-pointer text-white/80 hover:text-white transition-colors" 
                                 onClick={() => seekRelative(-10000)} />
                    </Tooltip>
                </div>
                
                {/* 播放/暂停按钮 */}
                <div className={'flex-none'}>
                    <Tooltip title={t('access.playback.play_pause')}>
                        {renderPlayButton('h-4 w-4 md:h-5 md:w-5 cursor-pointer text-white')}
                    </Tooltip>
                </div>
                
                {/* 前进按钮 - 在小屏幕上隐藏 */}
                <div className={'flex-none hidden sm:block'}>
                    <Tooltip title={t('access.playback.seek_forward')}>
                        <SkipForward className="h-4 w-4 cursor-pointer text-white/80 hover:text-white transition-colors" 
                                    onClick={() => seekRelative(10000)} />
                    </Tooltip>
                </div>
                
                {/* 进度条 */}
                <div className={'flex-auto px-1 md:px-2'}>
                    <Slider value={percent}
                            max={max}
                            onChange={handleProgressChange}
                            tooltip={{
                                formatter: (millis) => {
                                    return times.formatTime(millis)
                                }
                            }}
                            styles={{
                                rail: {
                                    backgroundColor: 'rgba(255,255,255,0.15)'
                                },
                                track: {
                                    backgroundColor: '#22c55e'
                                },
                                handle: {
                                    borderColor: '#22c55e',
                                    boxShadow: '0 0 0 4px rgba(34,197,94,0.15)'
                                }
                            }}
                    />
                </div>
                
                {/* 速度选择器 */}
                <div className={'flex-none'}>
                    <ConfigProvider theme={{
                        algorithm: theme.darkAlgorithm,
                    }}>
                        <Select size={'small'}
                                className="min-w-12 md:min-w-16 text-xs"
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
                                    { value: 1, label: '1x' },
                                    { value: 1.5, label: '1.5x' },
                                    { value: 2, label: '2x' },
                                    { value: 5, label: '5x' },
                                ]}
                        >
                        </Select>
                    </ConfigProvider>
                </div>
                
                {/* 音量控制 - 在小屏幕上隐藏 */}
                <div className={'flex-none hidden lg:block relative'} 
                     onMouseEnter={handleVolumeMouseEnter}
                     onMouseLeave={handleVolumeMouseLeave}>
                    <Tooltip title={isMuted ? t('access.playback.unmute') : t('access.playback.mute')}>
                        <div className="cursor-pointer" onClick={toggleMute}>
                            {isMuted || volume === 0 ? 
                                <VolumeX className="h-4 w-4 text-white/80 hover:text-white transition-colors" /> :
                                <Volume2 className="h-4 w-4 text-white/80 hover:text-white transition-colors" />
                            }
                        </div>
                    </Tooltip>
                    
                    {/* 音量滑块 */}
                    {showVolumeSlider && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/80 backdrop-blur-md rounded-lg p-3 border border-white/10">
                            <div className="h-20 flex items-center">
                                <Slider
                                    vertical
                                    value={isMuted ? 0 : volume * 100}
                                    max={100}
                                    onChange={(value) => handleVolumeChange(value / 100)}
                                    tooltip={{
                                        formatter: (value) => `${value}%`
                                    }}
                                    styles={{
                                        rail: {
                                            backgroundColor: 'rgba(255,255,255,0.15)'
                                        },
                                        track: {
                                            backgroundColor: '#22c55e'
                                        },
                                        handle: {
                                            borderColor: '#22c55e',
                                            boxShadow: '0 0 0 4px rgba(34,197,94,0.15)'
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
                
                {/* 全屏按钮 */}
                <div className={'flex-none'}>
                    <Tooltip title={isFullscreen ? t('access.playback.exit_fullscreen') : t('access.playback.fullscreen')}>
                        {isFullscreen ? 
                            <Minimize className="h-3 w-3 md:h-4 md:w-4 cursor-pointer text-white/80 hover:text-white transition-colors" 
                                     onClick={toggleFullscreen} /> :
                            <Maximize className="h-3 w-3 md:h-4 md:w-4 cursor-pointer text-white/80 hover:text-white transition-colors" 
                                     onClick={toggleFullscreen} />
                        }
                    </Tooltip>
                </div>
                
                {/* 时间显示 - 在小屏幕上隐藏 */}
                <div className={'flex-none text-xs text-white/80 min-w-[60px] md:min-w-[80px] text-right hidden md:block'}>
                    <b>{position}</b> / <b>{duration}</b>
                </div>
                
                {/* 移动端时间显示 - 只显示当前时间 */}
                <div className={'flex-none text-xs text-white/80 min-w-[40px] text-right md:hidden'}>
                    <b>{position}</b>
                </div>
            </div>
        </div>
    );
};

export default GuacdPlayback;
