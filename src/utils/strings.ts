class Strings {
    hasText = function (text: string | undefined | null) {
        return !(text === undefined || text === null || text.length === 0);
    }

    zeroPad = function zeroPad(num: number, minLength: number) {
        let str = num.toString();
        while (str.length < minLength)
            str = '0' + str;
        return str;
    };

    isTrue = function (text: string) {
        return (/^true$/i).test(text);
    }
}

let strings = new Strings();
export default strings;