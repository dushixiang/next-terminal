import assert from 'node:assert/strict';
import test from 'node:test';
import {isLicensePublicPath} from '../src/hook/license-public-path.ts';

for (const pathname of ['/terminal', '/graphics']) {
    test(`${pathname} 带分享令牌时跳过许可证查询`, () => {
        assert.equal(isLicensePublicPath(pathname, '?sessionId=session&sharerToken=share'), true);
    });

    test(`${pathname} 缺少或使用空分享令牌时仍查询许可证`, () => {
        for (const search of ['', '?sessionId=session', '?sharerToken=']) {
            assert.equal(isLicensePublicPath(pathname, search), false);
        }
    });
}

test('分享令牌不会让其他页面跳过许可证查询', () => {
    for (const pathname of ['/dashboard', '/terminal-monitor', '/terminal/other', '/graphics-playback']) {
        assert.equal(isLicensePublicPath(pathname, '?sharerToken=share'), false);
    }
});

test('保留已有公开路径及其子路径，避免匹配相似前缀', () => {
    for (const pathname of ['/login', '/setup', '/wechat-work/callback', '/oidc/callback', '/oidc/server/consent', '/oauth/consent', '/asset-authorization', '/login/other']) {
        assert.equal(isLicensePublicPath(pathname, ''), true);
    }
    assert.equal(isLicensePublicPath('/login-other', ''), false);
});

test('访问拒绝页无需许可证即可展示登录失败或访问策略拒绝原因', () => {
    assert.equal(isLicensePublicPath('/access-denied', '?code=10010&from=%2Flogin'), true);
    assert.equal(isLicensePublicPath('/access-denied', '?code=10026&from=%2Fdashboard'), true);
    assert.equal(isLicensePublicPath('/access-denied-other', ''), false);
});

test('需要登录的访问、回放和监控页面仍查询许可证', () => {
    for (const pathname of ['/', '/access', '/standalone-access', '/browser', '/terminal-playback', '/graphics-playback', '/video-playback', '/terminal-monitor', '/graphics-monitor']) {
        assert.equal(isLicensePublicPath(pathname, ''), false);
    }
});
