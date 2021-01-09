import React, {Component} from 'react';
import Guacamole from "guacamole-common-js";
import {server} from "../../common/constants";

class Playback extends Component {

    componentDidMount() {
        let sessionId = this.props.sessionId;
        this.initPlayer(sessionId);
    }

    componentWillMount() {

    }

    initPlayer(sessionId) {
        var RECORDING_URL = `${server}/sessions/${sessionId}/recording`;

        var player = document.getElementById('player');
        var display = document.getElementById('display');
        var playPause = document.getElementById('play-pause');
        var position = document.getElementById('position');
        var positionSlider = document.getElementById('position-slider');
        var duration = document.getElementById('duration');

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
        recording.onplay = function () {
            playPause.textContent = 'Pause';
        };

        // If paused, the play/pause button should read "Play"
        recording.onpause = function () {
            playPause.textContent = 'Play';
        };

        // Toggle play/pause when display or button are clicked
        display.onclick = playPause.onclick = function () {
            if (!recording.isPlaying())
                recording.play();
            else
                recording.pause();
        };

        // Fit display within containing div
        recordingDisplay.onresize = function displayResized(width, height) {

            // Do not scale if display has no width
            if (!width)
                return;

            // Scale display to fit width of container
            recordingDisplay.scale(display.offsetWidth / width);

        };

        // Update slider and status when playback position changes
        recording.onseek = function positionChanged(millis) {
            position.textContent = formatTime(millis);
            positionSlider.value = millis;
        };

        // Update slider and status when duration changes
        recording.onprogress = function durationChanged(millis) {
            duration.textContent = formatTime(millis);
            positionSlider.max = millis;
        };

        // Seek within recording if slider is moved
        positionSlider.onchange = function sliderPositionChanged() {

            // Request seek
            recording.seek(positionSlider.value, function seekComplete() {

                // Seek has completed
                player.className = '';

            });

            // Seek is in progress
            player.className = 'seeking';

        };
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

                    <div className="controls">
                        <button id="play-pause">Play</button>
                        <input id="position-slider" type="range"/>
                        <span id="position">00:00</span>
                        <span>/</span>
                        <span id="duration">00:00</span>
                    </div>

                </div>
            </div>
        );
    }
}

export default Playback;
