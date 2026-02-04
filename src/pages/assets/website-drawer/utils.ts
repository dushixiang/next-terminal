import { message } from "antd";
import { RcFile } from "antd/es/upload";

export const parseURL = (url: string) => {
    const parsedURL = new URL(url);
    const scheme = parsedURL.protocol.replace(':', '');
    const host = parsedURL.hostname;
    const port = parsedURL.port || (scheme === 'http' ? '80' : scheme === 'https' ? '443' : '');

    return { scheme, host, port };
};

export const validateFileSize = (file: RcFile): boolean => {
    if (file.size > 1024 * 1024) {
        message.error('Image must be smaller than 1MB!');
        return false;
    }
    return true;
};
