// 外部入口由构建环境配置；未配置或协议无效时不展示入口。
const httpLink = (value: string | undefined): string => {
    if (!value) return '';
    try {
        const url = new URL(value);
        return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
    } catch {
        return '';
    }
};

export const externalLinks = {
    licensePortal: httpLink(import.meta.env.VITE_LICENSE_PORTAL_URL),
    pricing: httpLink(import.meta.env.VITE_PRICING_URL),
    changelog: httpLink(import.meta.env.VITE_CHANGELOG_URL),
};
