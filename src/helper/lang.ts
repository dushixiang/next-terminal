import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import zhTW from "antd/locale/zh_TW";
import jaJP from "antd/locale/ja_JP";

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