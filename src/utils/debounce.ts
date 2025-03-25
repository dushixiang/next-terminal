export function debounce<T extends Function>(cb: T, wait = 20) {
    let h: number;
    let callable = (...args: any) => {
        clearTimeout(h);
        // @ts-ignore
        h = setTimeout(() => cb(...args), wait);
    };
    return <T>(<any>callable);
}