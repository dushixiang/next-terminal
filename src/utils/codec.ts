import {Base64} from "js-base64";

export const safeEncode = (data: any) => {
    let s = JSON.stringify(data);
    return Base64.encode(s, true);
}

export const safeDecode = (data: string) => {
    let s = Base64.decode(data);
    return JSON.parse(s);
}