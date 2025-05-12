import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import {resources} from "./locales/resources";

let savedLang = localStorage.getItem('nt-language');
if (savedLang) {
    savedLang = savedLang.replaceAll(`"`, "");
}
console.log(`get lang: ${savedLang}`);

i18n
    // 将 i18n 实例传递给 react-i18next
    .use(initReactI18next)
    // 初始化 i18next
    // 所有配置选项: https://www.i18next.com/overview/configuration-options
    .init({
        resources,
        fallbackLng: "en-US",
        lng: savedLang,
        debug: true,
        interpolation: {
            escapeValue: false // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
        }
    });

export default i18n;