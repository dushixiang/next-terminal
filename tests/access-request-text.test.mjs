import test from 'node:test';
import assert from 'node:assert/strict';
import {accessRequestReason} from '../src/pages/accessrequest/access-request-text.ts';
import fs from 'node:fs';

test('系统关闭原因码按所选语言展示', () => {
    for (const locale of ['zh-CN', 'en-US', 'zh-TW', 'ja-JP']) {
        const messages = JSON.parse(fs.readFileSync(new URL(`../src/react-i18next/locales/${locale}.json`, import.meta.url), 'utf8'));
        const t = key => key.split('.').reduce((value, part) => value[part], messages);
        assert.equal(accessRequestReason('closed', 'existing_authorization', t), messages.access_request.closed_existing_authorization);
    }
});

test('审批人备注和未知原因保留原文', () => {
    const t = () => { throw new Error('不应翻译自由文本'); };
    assert.equal(accessRequestReason('approved', 'existing_authorization', t), 'existing_authorization');
    assert.equal(accessRequestReason('rejected', 'reviewer comment', t), 'reviewer comment');
    assert.equal(accessRequestReason('closed', 'unknown_reason', t), 'unknown_reason');
    assert.equal(accessRequestReason('closed', undefined, t), undefined);
});
