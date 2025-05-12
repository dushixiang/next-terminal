import {atomWithLocalStorage} from "@/src/hook/atom";
import {useAtom} from "jotai";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import zhTW from "antd/locale/zh_TW";
import jaJP from "antd/locale/ja_JP";
import i18n from "i18next";

const defaultLanguage = 'en-US';

const configAtom = atomWithLocalStorage<string>('nt-language', defaultLanguage);

export function useLang() {
    const [lang, setLang] = useAtom(configAtom);

    const wrapSetLang = (v: string) => {
        i18n.changeLanguage(v)
            .then(() => setLang(v))
            .catch(error => console.error('Language change failed:', error));
    }

    return [lang, wrapSetLang] as [string, (v: string) => void];
}

export const translateI18nToAntdLocale = (key: string) => {
    switch (key) {
        case 'en-US':
            return enUS;
        case 'zh-CN':
            return zhCN;
        case 'zh-TW':
            return zhTW;
        case 'ja-JP':
            return jaJP;
        default:
            return zhCN;
    }
}

const VALID_LOCALES = ['en-US', 'zh-CN', 'zh-TW', 'ja-JP'];

export const translateI18nToESLocale = (key: string) => {
    if (VALID_LOCALES.includes(key)) {
        return key;
    }
    return defaultLanguage;
}