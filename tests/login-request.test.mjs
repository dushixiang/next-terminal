import test from 'node:test';
import assert from 'node:assert/strict';
import {passwordLoginRequest} from '../src/pages/account/login-request.ts';

const values = {username: 'nclfoe', password: ' password ', key: 'old-key'};

test('未选择认证来源时默认本地密码登录，使用最新验证码 key', () => {
    const request = passwordLoginRequest(values, true, 'new-key');
    assert.equal(request.source, 'password');
    assert.equal(request.key, 'new-key');
    assert.equal(request.password, ' password ');
    assert.equal(values.key, 'old-key');
});

test('只有 LDAP 已启用且用户明确选择时才提交域账号登录', () => {
    assert.equal(passwordLoginRequest({...values, source: 'ldap'}, true).source, 'ldap');
    assert.equal(passwordLoginRequest({...values, source: 'ldap'}, false).source, 'password');
    assert.equal(passwordLoginRequest({...values, source: 'password'}, true).source, 'password');
});
