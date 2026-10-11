import zhCN from '../../react-i18next/locales/system-events/zh-CN.json';
import zhTW from '../../react-i18next/locales/system-events/zh-TW.json';
import enUS from '../../react-i18next/locales/system-events/en-US.json';
import jaJP from '../../react-i18next/locales/system-events/ja-JP.json';

const templates = {
    'zh-CN': new Map(zhCN.map(item => [item.id, item.other])),
    'zh-TW': new Map(zhTW.map(item => [item.id, item.other])),
    'en-US': new Map(enUS.map(item => [item.id, item.other])),
    'ja-JP': new Map(jaJP.map(item => [item.id, item.other])),
};

// 使用前端自带的通知模板；只处理简单参数，缺少数据或未知模板时保留历史原文。
export const systemEventText = (
    language: string,
    key: string | undefined,
    args: Record<string, unknown> | undefined,
    original: string | undefined,
): string => {
    const normalized = language.toLowerCase().replaceAll('_', '-');
    const locale = normalized.startsWith('en') ? 'en-US'
        : normalized.startsWith('ja') ? 'ja-JP'
            : normalized === 'zh-tw' || normalized === 'zh-hk' ? 'zh-TW' : 'zh-CN';
    const template = key ? templates[locale].get(key) : undefined;
    if (!template || (!key?.endsWith('.title') && !key?.endsWith('.summary'))) {
        return original || '-';
    }
    const literal = template.replace(/{{\s*\.([A-Za-z][A-Za-z0-9_]*)\s*}}/g, '');
    if (literal.includes('{{') || literal.includes('}}')) {
        return original || '-';
    }
    let complete = true;
    const text = template.replace(/{{\s*\.([A-Za-z][A-Za-z0-9_]*)\s*}}/g, (_match, name: string) => {
        const value = args && Object.prototype.hasOwnProperty.call(args, name) ? args[name] : undefined;
        if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
            complete = false;
            return '';
        }
        return String(value);
    });
    return complete ? text : original || '-';
};
