import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {resources} from "./locales/resources";
// import LanguageDetector from 'i18next-browser-languagedetector';

i18n
    // 检测用户语言
    // 操作文档: https://github.com/i18next/i18next-browser-languageDetector
    // .use(LanguageDetector)
    // 将 i18n 实例传递给 react-i18next
    .use(initReactI18next)
    // 初始化 i18next
    // 所有配置选项: https://www.i18next.com/overview/configuration-options
    .init({
        resources,
        fallbackLng: "zh-CN",
        lng: "zh-CN",
        debug: true,
        interpolation: {
            escapeValue: false // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
        }
    });

export default i18n;