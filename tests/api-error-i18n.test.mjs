import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ApiError, getLocalizedErrorMessage} from '../src/api/core/api-error.ts';

const locales = {};
for (const language of ['zh-CN', 'zh-TW', 'en-US', 'ja-JP']) {
    locales[language] = JSON.parse(await readFile(new URL(`../src/react-i18next/locales/${language}.json`, import.meta.url), 'utf8'));
}
const translate = language => key => {
    const [namespace, code] = key.split('.');
    return locales[language][namespace]?.[code] ?? key;
};

for (const language of Object.keys(locales)) {
    test(`${language} 验证码错误按错误码使用实际语言资源`, () => {
        const error = new ApiError('captcha is incorrect', {code: 10006});
        assert.equal(getLocalizedErrorMessage(error, translate(language)), locales[language].errors['10006']);
        assert.notEqual(getLocalizedErrorMessage(error, translate(language)), error.message);
    });
}

test('同一个错误切换语言后重新解析，不修改原始异常', () => {
    const error = new ApiError('captcha is incorrect', {code: 10006});
    const chinese = getLocalizedErrorMessage(error, translate('zh-CN'));
    const japanese = getLocalizedErrorMessage(error, translate('ja-JP'));
    assert.notEqual(chinese, japanese);
    assert.equal(error.message, 'captcha is incorrect');
});

test('未知错误码和普通异常保留原始提示，不显示翻译键', () => {
    assert.equal(getLocalizedErrorMessage(new ApiError('server detail', {code: 999999}), translate('zh-CN')), 'server detail');
    assert.equal(getLocalizedErrorMessage(new Error('network detail'), translate('zh-CN')), 'network detail');
    assert.equal(getLocalizedErrorMessage({code: 999999, message: 'detail'}, translate('zh-CN')), 'detail');
});
