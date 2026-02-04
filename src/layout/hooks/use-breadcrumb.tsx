import {useEffect, useState} from 'react';
import {Link, useLocation} from 'react-router-dom';
import {useTranslation} from 'react-i18next';

/**
 * 面包屑导航 Hook
 * 基于当前路由生成面包屑数据
 */
export function useBreadcrumb(breadcrumbNameMap: Map<string, string>) {
    const location = useLocation();
    const {t} = useTranslation();
    const [breakItems, setBreakItems] = useState<any[]>([]);

    useEffect(() => {
        // 解析路径生成面包屑
        const pathSnippets = location.pathname.split('/').filter(i => i);
        const extraBreadcrumbItems = pathSnippets.map((_, index) => {
            const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
            const label = breadcrumbNameMap.get(url) || '';
            return {
                title: <Link to={url}>{label}</Link>
            };
        });

        // 添加首页面包屑
        const breadcrumbItems = [{
            title: <Link to={'/dashboard'}>{t('general.home')}</Link>
        }].concat(extraBreadcrumbItems);

        setBreakItems(breadcrumbItems);
    }, [location.pathname, breadcrumbNameMap, t]);

    return {breakItems};
}
