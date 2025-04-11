export function renderSize(value: number | undefined, places?: number) {
    if (undefined == value || value === 0) {
        return "0 B";
    }
    const unitArr = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    let srcSize = value;
    let index = Math.floor(Math.log(srcSize) / Math.log(1024));
    let size = srcSize / Math.pow(1024, index);
    if (places == undefined) {
        places = 2
    }
    let sizeStr = size.toFixed(places);
    return sizeStr + ' ' + unitArr[index];
}

export function toggleFullScreen() {
    if (!document.fullscreenElement) {
        // @ts-ignore
        if (navigator.keyboard) {
            // @ts-ignore
            navigator.keyboard.lock();
        }
        document.documentElement.requestFullscreen();
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            // @ts-ignore
            if (navigator.keyboard) {
                // @ts-ignore
                navigator.keyboard?.unlock();
            }
        }
    }
}

// @ts-ignore
export function requestFullScreen(element: HTMLElement) {
    if (document.fullscreenElement) {
        document.exitFullscreen();
        // @ts-ignore
        // if (navigator.keyboard) {
        //     // @ts-ignore
        //     navigator.keyboard?.unlock();
        // }
    } else {
        // @ts-ignore
        // if (navigator.keyboard) {
        //     // @ts-ignore
        //     navigator.keyboard.lock();
        // }
        element.requestFullscreen();
    }
}

export function isFullScreen() {
    return document.fullscreenElement != null;
}

export function findScroller(element: HTMLElement) {
    element.onscroll = function () {
        console.log(element)
    }
    Array.from(element.children).forEach(findScroller)
}

export const generateRandomId = (): string => {
    const array = new Uint8Array(16); // 16 bytes = 128 bits
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export function openOrSwitchToPage(url: string, windowName: string) {
    // 尝试切换到已打开的窗口
    const win = window.open('', windowName);
    if (win.location.href === 'about:blank') {
        win.location.href = url;
        win.focus();
    } else if (win.location.href !== url) {
        // 如果窗口 URL 不匹配目标 URL，则更新并切换
        win.location.href = url;
        win.focus();
    } else {
        win.focus();
    }
}

export function isFontAvailable(fontName: string) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const text = 'abcdefghijklmnopqrstuvwxyz0123456789';

    context.font = '72px monospace';
    const baselineSize = context.measureText(text).width;

    context.font = '72px ' + fontName + ', monospace';
    const newSize = context.measureText(text).width;
    return newSize !== baselineSize;
}

export function isMobileByMediaQuery() {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    return mediaQuery.matches;
}

export function isFirefox() {
    return navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
}

// 1、在IE中这个事件你只要去关闭窗口就触发。
// 2、谷歌、火狐等在F12调试模式中也会起效
// 3、谷歌、火狐、QQ等浏览器中被优化了，需要用户在页面有过任何操作才会出现提示！（坑）。
export const beforeUnload = function (event) {
    // 一些浏览器可能需要设置 returnValue 属性
    event.preventDefault();
    event.returnValue = "你确定要离开这个页面吗？";
}

export const browserDownload = (url: string) => {
    window.removeEventListener('beforeunload', beforeUnload, true);
    const a = document.createElement('a');
    a.href = url;
    if (isFirefox()) {
        a.target = '_blank';
    }
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.addEventListener('beforeunload', beforeUnload, true);
}

export const handleKeyDown = (e) => {
    // 禁用 F12
    if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        return false;
    }
    // 禁用 Ctrl+Shift+I（开发者工具）
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
    }
    // 禁用 Ctrl+Shift+J（控制台）
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
    }
    // 禁用 Ctrl+U（查看源码）
    if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
    }
}