export function throttle(func: Function, delay: number) {
    let timeout: NodeJS.Timeout | null;
    let lastCalledTime = 0;

    return function(this: any, ...args: any[]) {
        const now = new Date().getTime();
        const remaining = delay - (now - lastCalledTime);
        const context = this;

        if (remaining <= 0) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            func.apply(context, args);
            lastCalledTime = now;
        } else if (!timeout) {
            timeout = setTimeout(function() {
                func.apply(context, args);
                lastCalledTime = new Date().getTime();
                timeout = null;
            }, remaining);
        }
    };
}
