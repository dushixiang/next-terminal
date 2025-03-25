export const MessageTypeData = 0;
export const MessageTypeResize = 1;
export const MessageTypeJoin = 2;
export const MessageTypeExit = 3;
export const MessageTypeDirChanged = 4;
export const MessageTypeKeepAlive = 5;


/**
 * package terminal
 *
 * import "strconv"
 *
 * type MessageType int
 *
 * const (
 *    MessageTypeData   MessageType = 0
 *    MessageTypeResize MessageType = 1
 *    MessageTypeJoin   MessageType = 2
 *    MessageTypeExit   MessageType = 3
 * )
 *
 * type Message struct {
 *    Type    MessageType
 *    Content string
 * }
 *
 * func (r Message) ToString() string {
 *    if r.Content != "" {
 *        return strconv.Itoa(int(r.Type)) + r.Content
 *    } else {
 *        return strconv.Itoa(int(r.Type))
 *    }
 * }
 *
 * func NewMessage(typ MessageType, content string) Message {
 *    return Message{Content: content, Type: typ}
 * }
 *
 * func ParseMessage(value string) (message Message, err error) {
 *    if value == "" {
 *        return
 *    }
 *
 *    typ, err := strconv.Atoi(value[:1])
 *    if err != nil {
 *        return
 *    }
 *    var content = value[1:]
 *    message = NewMessage(MessageType(typ), content)
 *    return
 * }
 *
 * type WindowSize struct {
 *    Cols int `json:"cols"`
 *    Rows int `json:"rows"`
 * }
 */

export class Message {
    public readonly type: number;
    public readonly content: string;

    constructor(type: number, content: string) {
        this.type = type;
        this.content = content;
    }

    public toString(): string {
        if (this.content !== "") {
            return this.type + this.content;
        } else {
            return this.type.toString();
        }
    }

    public static parse(value: string): Message {
        if (value === "") {
            return new Message(0, "");
        }

        let typ = parseInt(value[0]);
        let content = value.slice(1);
        return new Message(typ, content);
    }
}