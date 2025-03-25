const eventNames = [
    "NETWORK:UN_CONNECT",
    "UI:LOADING",
    "API:UN_AUTH", "API:VALIDATE_ERROR", "API:NEED_ENABLE_OPT", "API:NEED_CHANGE_PASSWORD",
    "WS:MESSAGE",
];
type EventNames = (typeof eventNames)[number];

class EventEmitter {
    private listeners: Record<EventNames, Set<Function>> = {};

    on(eventName: EventNames, listener: Function) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = new Set();
        }
        this.listeners[eventName].add(listener);
    }

    off(eventName: EventNames, listener: Function) {
        if (!this.listeners[eventName]) {
            return;
        }
        this.listeners[eventName].delete(listener);
    }

    emit(eventName: EventNames, ...args: any[]) {
        if (!this.listeners[eventName]) {
            return;
        }
        this.listeners[eventName].forEach(listener => {
            listener(...args);
        });
    }
}

export default new EventEmitter();