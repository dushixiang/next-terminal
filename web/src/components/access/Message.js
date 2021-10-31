const Message = class Message {
    constructor(type, content) {
        this.type = type;
        this.content = content;
    }

    toString() {
        return this.type + this.content;
    }

    static Closed = 0;
    static Connected = 1;
    static Data = 2;
    static Resize = 3;
    static Ping = 4;

    static parse(s) {
        let type = parseInt(s.substring(0, 1));
        let content = s.substring(1, s.length);
        return new Message(type, content);
    }
};
export default Message;