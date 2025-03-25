export class Duration {
    private readonly milliseconds: number;

    constructor(milliseconds: number) {
        this.milliseconds = milliseconds;
    }

    static fromObject({ minutes = 0, seconds = 0, milliseconds = 0 }: { minutes?: number, seconds?: number, milliseconds?: number }): Duration {
        const totalMilliseconds = minutes * 60 * 1000 + seconds * 1000 + milliseconds;
        return new Duration(totalMilliseconds);
    }

    format(): string {
        const minutes = Math.floor(this.milliseconds / (60 * 1000));
        const seconds = Math.floor((this.milliseconds % (60 * 1000)) / 1000);
        // const milliseconds = this.milliseconds % 1000;

        let formattedString = "";
        if (minutes > 0) {
            formattedString += `${minutes}m`;
        }
        if (seconds > 0) {
            formattedString += `${seconds}s`;
        }
        // if (milliseconds > 0) {
        //     formattedString += `.${milliseconds}`;
        // }

        return formattedString;
    }
}