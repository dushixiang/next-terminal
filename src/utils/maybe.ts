export function maybe<R>(v: any | undefined | null, r: R): R {
    if (v) {
        return v;
    }
    return r
}