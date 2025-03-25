import {Locale} from "antd/lib/locale";
import {atomWithLocalStorage} from "@/src/hook/atom";
import {useAtom} from "jotai/index";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import zhTW from "antd/locale/zh_TW";
import jaJP from "antd/locale/ja_JP";

const defaultI18n = 'zh-CN'

type ConfigLang = {
    antdLocale: Locale,
    i18n: string;
}

export const DefaultLang: ConfigLang = {
    antdLocale: enUS,
    i18n: defaultI18n
}

const configAtom = atomWithLocalStorage<ConfigLang>('nt-lang', DefaultLang);

export function useLang() {
    return useAtom(configAtom)
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
    return defaultI18n;
}