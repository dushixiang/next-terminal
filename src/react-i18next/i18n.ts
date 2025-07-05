import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import {initReactI18next} from 'react-i18next';
import {resources} from "./locales/resources";

i18n
    .use(LanguageDetector) // 使用语言检测插件
    .use(initReactI18next) // 绑定 react-i18next 实例到 react
    .init({
        resources,
        fallbackLng: "en-US",
        debug: true,
        detection: {
            // 可配置的语言检测顺序和缓存方式
            order: ['localStorage', 'cookie', 'navigator', 'htmlTag'],
            caches: ['localStorage', 'cookie'],
            lookupLocalStorage: 'nt-lang',
            lookupCookie: 'nt-lang',
        },
        interpolation: {
            escapeValue: false // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
        }
    });

export default i18n;