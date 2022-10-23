import strings from "./strings";

class Times {

    formatTime = function formatTime(millis) {
        const totalSeconds = Math.floor(millis / 1000);

        // Split into seconds and minutes
        const seconds = totalSeconds % 60;
        const minutes = Math.floor(totalSeconds / 60);

        // Format seconds and minutes as MM:SS
        return strings.zeroPad(minutes, 2) + ':' + strings.zeroPad(seconds, 2);

    };
}

let times = new Times();
export default times;