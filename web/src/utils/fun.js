export const debounce = function (fn, delay = 500) {
    // timer 是在闭包中的
    let timer = null;

    return function () {
        if (timer) {
            clearTimeout(timer)
        }
        timer = setTimeout(() => {
            fn.apply(this, arguments)
            timer = null
        }, delay)
    }
}