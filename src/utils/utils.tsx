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

export function isMac(){
    return /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
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
    // 禁用所有 F1-F12 功能键
    if ((e.key && e.key.startsWith('F') && parseInt(e.key.substring(1)) >= 1 && parseInt(e.key.substring(1)) <= 12) ||
        (e.keyCode >= 112 && e.keyCode <= 123)) {
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


const BLOCKED_CTRL_KEYS = [
    'A', // Select All
    'F', // Find
    'S', // Save
    'P', // Print
    'R', // Refresh
    'T', // New Tab
    'N', // New Window
    'W', // Close Tab
    'U', // View Source
    'H', // History
    'J', // Downloads
    'D', // Bookmark
    'L', // Focus Address Bar
];

const BLOCKED_FUNCTION_KEYS = [
    'F5', // Refresh
    'F11', // Fullscreen
    'F6', // Focus Address Bar (alternative)
];

// For combinations like Ctrl + Shift + I
const BLOCKED_CTRL_SHIFT_KEYS = [
    'I', // Developer Tools
    'J', // Developer Tools
    'K', // Developer Tools
];

export const dropKeydown = (e) => {
    // Block Ctrl + specific keys
    if (e.ctrlKey && !e.shiftKey && !e.altKey && BLOCKED_CTRL_KEYS.includes(e.key.toUpperCase())) {
        console.log(`Blocked: Ctrl + ${e.key}`);
        e.preventDefault();
        return false;
    }

    // Block Ctrl + Shift + specific keys
    if (e.ctrlKey && e.shiftKey && !e.altKey && BLOCKED_CTRL_SHIFT_KEYS.includes(e.key.toUpperCase())) {
        console.log(`Blocked: Ctrl + Shift + ${e.key}`);
        e.preventDefault();
        return false;
    }

    // Block specific Function keys
    if (BLOCKED_FUNCTION_KEYS.includes(e.key.toUpperCase())) {
        console.log(`Blocked: ${e.key}`);
        e.preventDefault();
        return false;
    }

    // Block Meta key (Windows key / Command key)
    // Note: On macOS, Cmd+W, Cmd+N, Cmd+T are common and might already be covered by BLOCKED_CTRL_KEYS
    // if you intend for Ctrl to also mean Cmd on Mac. If not, you need separate handling or
    // ensure your BLOCKED_CTRL_KEYS logic correctly interprets e.ctrlKey vs e.metaKey based on OS.
    // For simplicity here, we just block the Meta key itself if pressed without other modifiers (usually not useful alone).
    // If you want to block Cmd+C, Cmd+V, etc., you'd add them to a list similar to BLOCKED_CTRL_KEYS but check e.metaKey.
    if (e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) { // Block if *only* Meta is pressed
        console.log(`Blocked: Meta key`);
        e.preventDefault();
        return false;
    }

    // Example: Block Alt + Left/Right Arrow
    if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        console.log(`Blocked: Alt + ${e.key}`);
        e.preventDefault();
        return false;
    }

    return true; // Allow other events
};


export function formatUptime(seconds?: number): string {
    if (!seconds || seconds === 0) {
        return '0秒';
    }

    const days = Math.floor(seconds / (24 * 60 * 60));
    const remainingSecondsAfterDays = seconds % (24 * 60 * 60);
    const hours = Math.floor(remainingSecondsAfterDays / (60 * 60));
    const remainingSecondsAfterHours = remainingSecondsAfterDays % (60 * 60);
    const minutes = Math.floor(remainingSecondsAfterHours / 60);
    const secs = Math.floor(remainingSecondsAfterHours % 60);

    const parts: string[] = [];

    if (days > 0) {
        parts.push(`${days}天`);
    }
    if (hours > 0) {
        parts.push(`${hours}小时`);
    }
    if (minutes > 0) {
        parts.push(`${minutes}分钟`);
    }

    // 如果时间很短（小于1分钟），显示秒数
    if (days === 0 && hours === 0 && minutes === 0 && secs > 0) {
        parts.push(`${secs}秒`);
    }

    // 如果没有任何时间单位，返回 0秒
    if (parts.length === 0) {
        return '0秒';
    }

    // 最多显示2个最大的时间单位，避免过长
    return parts.slice(0, 2).join(' ');
}

// 如果您更喜欢英文格式，可以使用这个版本
export function formatUptimeEn(seconds?: number): string {
    if (!seconds || seconds === 0) {
        return '0s';
    }

    const days = Math.floor(seconds / (24 * 60 * 60));
    const remainingSecondsAfterDays = seconds % (24 * 60 * 60);
    const hours = Math.floor(remainingSecondsAfterDays / (60 * 60));
    const remainingSecondsAfterHours = remainingSecondsAfterDays % (60 * 60);
    const minutes = Math.floor(remainingSecondsAfterHours / 60);
    const secs = Math.floor(remainingSecondsAfterHours % 60);

    const parts: string[] = [];

    if (days > 0) {
        parts.push(`${days}d`);
    }
    if (hours > 0) {
        parts.push(`${hours}h`);
    }
    if (minutes > 0) {
        parts.push(`${minutes}m`);
    }

    // 如果时间很短（小于1分钟），显示秒数
    if (days === 0 && hours === 0 && minutes === 0 && secs > 0) {
        parts.push(`${secs}s`);
    }

    // 如果没有任何时间单位，返回 0s
    if (parts.length === 0) {
        return '0s';
    }

    // 最多显示2个最大的时间单位
    return parts.slice(0, 2).join(' ');
}

// 更简洁的格式化函数，适合表格显示
export function formatUptimeCompact(seconds?: number): string {
    if (!seconds || seconds === 0) {
        return '-';
    }

    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);

    if (days > 0) {
        return `${days}天${hours}时`;
    }
    if (hours > 0) {
        return `${hours}时${minutes}分`;
    }
    if (minutes > 0) {
        return `${minutes}分钟`;
    }

    return '< 1分钟';
}

export function getColor(percent: number): string {
    if (percent < 60) return "#06DF73";
    if (percent < 85) return "#FF8905";
    return "#FF6467";
}