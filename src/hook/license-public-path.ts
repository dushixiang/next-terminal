// 无需许可证信息的登录、错误展示和授权流程页面。
// 授权流程的业务接口仍按各自规则校验登录状态。
const PUBLIC_PATHS = [
    '/login',
    '/setup',
    '/access-denied',
    '/wechat-work/callback',
    '/oidc/callback',
    '/oidc/server/consent',
    '/oauth/consent',
    '/asset-authorization',
];

export const isLicensePublicPath = (pathname: string, search: string) => {
    if (PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`))) {
        return true;
    }

    // 分享页通过分享令牌访问会话，无需获取登录账号的许可证信息。
    // 令牌有效性与会话权限仍由后端校验。
    return (pathname === '/terminal' || pathname === '/graphics')
        && !!new URLSearchParams(search).get('sharerToken');
};
