import React, {Component} from 'react';
import Guacamole from "guacamole-common-js";
import {server} from "../../common/env";
import {Button, Col, Row, Slider, Typography} from "antd";
import {PauseCircleOutlined, PlayCircleOutlined} from '@ant-design/icons';
import {Tooltip} from "antd/lib/index";

const {Text} = Typography;

class Playback extends Component {

    state = {
        playPauseIcon: <PlayCircleOutlined/>,
        playPauseIconTitle: '播放',
        recording: undefined,
        percent: 0,
        max: 0,
    }

    componentDidMount() {
        let sessionId = this.props.sessionId;
        this.initPlayer(sessionId);
    }

    componentWillMount() {

    }

    initPlayer(sessionId) {
        var RECORDING_URL = `${server}/sessions/${sessionId}/recording`;

        var display = document.getElementById('display');

        var tunnel = new Guacamole.StaticHTTPTunnel(RECORDING_URL);
        var recording = new Guacamole.SessionRecording(tunnel);

        var recordingDisplay = recording.getDisplay();

        /**
         * Converts the given number to a string, adding leading zeroes as necessary
         * to reach a specific minimum length.
         *
         * @param {Numer} num
         *     The number to convert to a string.
         *
         * @param {Number} minLength
         *     The minimum length of the resulting string, in characters.
         *
         * @returns {String}
         *     A string representation of the given number, with leading zeroes
         *     added as necessary to reach the specified minimum length.
         */
        var zeroPad = function zeroPad(num, minLength) {

            // Convert provided number to string
            var str = num.toString();

            // Add leading zeroes until string is long enough
            while (str.length < minLength)
                str = '0' + str;

            return str;

        };

        /**
         * Converts the given millisecond timestamp into a human-readable string in
         * MM:SS format.
         *
         * @param {Number} millis
         *     An arbitrary timestamp, in milliseconds.
         *
         * @returns {String}
         *     A human-readable string representation of the given timestamp, in
         *     MM:SS format.
         */
        var formatTime = function formatTime(millis) {

            // Calculate total number of whole seconds
            var totalSeconds = Math.floor(millis / 1000);

            // Split into seconds and minutes
            var seconds = totalSeconds % 60;
            var minutes = Math.floor(totalSeconds / 60);

            // Format seconds and minutes as MM:SS
            return zeroPad(minutes, 2) + ':' + zeroPad(seconds, 2);

        };

        // Add playback display to DOM
        display.appendChild(recordingDisplay.getElement());

        // Begin downloading the recording
        recording.connect();

        // If playing, the play/pause button should read "Pause"
        recording.onplay = () => {
            // 暂停
            this.setState({
                playPauseIcon: <PauseCircleOutlined/>,
                playPauseIconTitle: '暂停',
            })
        };

        // If paused, the play/pause button should read "Play"
        recording.onpause = () => {
            // 播放
            this.setState({
                playPauseIcon: <PlayCircleOutlined/>,
                playPauseIconTitle: '播放',
            })
        };

        // Toggle play/pause when display or button are clicked
        display.onclick = this.handlePlayPause;

        // Fit display within containing div
        recordingDisplay.onresize = function displayResized(width, height) {

            // Do not scale if display has no width
            if (!width)
                return;

            // Scale display to fit width of container
            recordingDisplay.scale(display.offsetWidth / width);
        };

        recording.onseek = (millis) => {
            this.setState({
                percent: millis,
                position: formatTime(millis)
            })
        };

        recording.onprogress = (millis) => {
            this.setState({
                max: millis,
                duration: formatTime(millis)
            })
        };

        this.setState({
            recording: recording
        }, () => {
            this.handlePlayPause();
        });
    }

    handlePlayPause = () => {
        let recording = this.state.recording;
        if (recording) {
            if (this.state.percent === this.state.max) {
                // 重播
                this.setState({
                    percent: 0
                }, () => {
                    recording.seek(0, () => {
                        recording.play();
                    });
                });
            }

            if (!recording.isPlaying()) {
                recording.play();
            } else {
                recording.pause();
            }
        }
    }

    handleProgressChange = (value) => {
        let recording = this.state.recording;
        if (recording) {
            // Request seek
            recording.seek(value, () => {
                console.log('complete');
            });
        }

    }

    render() {
        return (
            <div>
                <div id="player">

                    <div id="display">
                        <div className="notification-container">
                            <div className="seek-notification">
                            </div>
                        </div>
                    </div>

                    <Row justify="space-around" align="middle" style={{marginLeft: 7, marginRight: 7, marginTop: 3}}
                         gutter={[5, 5]}>
                        <Col flex="none">
                            <Tooltip title={this.state.playPauseIconTitle}>
                                <Button size='small' onClick={this.handlePlayPause} icon={this.state.playPauseIcon}/>
                            </Tooltip>
                        </Col>
                        <Col flex="auto">
                            <Slider value={this.state.percent} max={this.state.max} tooltipVisible={false}
                                    onChange={this.handleProgressChange}/>
                        </Col>
                        <Col flex='none'>
                            <Text>{this.state.position}</Text>/ <Text>{this.state.duration}</Text>
                        </Col>
                    </Row>
                </div>
            </div>
        );
    }
}

export default Playback;
