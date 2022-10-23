class Strings {
    hasText = function (text) {
        return !(text === undefined || text === null || text.length === 0);
    }

    zeroPad = function zeroPad(num, minLength) {
        let str = num.toString();
        while (str.length < minLength)
            str = '0' + str;
        return str;
    };
}

let strings = new Strings();
export default strings;