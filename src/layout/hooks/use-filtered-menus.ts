import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {getMenus} from '@/layout/menus.tsx';
import {getCurrentUser, hasMenu} from '@/utils/permission.ts';
import type {MenuProps} from 'antd';

/**
 * 过滤菜单 Hook
 * 根据权限过滤菜单，生成面包屑名称映射
 */
export function useFilteredMenus() {
    const {t} = useTranslation();
    const menuKeys = getCurrentUser()?.menus?.map(item => item.key).join('|') ?? '';
    const [filteredMenus, setFilteredMenus] = useState<MenuProps['items']>([]);
    const [breadcrumbNameMap, setBreadcrumbNameMap] = useState<Map<string, string>>(
        () => new Map()
    );

    useEffect(() => {
        // 获取所有菜单
        const menus = getMenus(t);

        // 生成面包屑名称映射
        const nextBreadcrumbNameMap = new Map<string, string>();
        menus.forEach(r => {
            if (r.children) {
                r.children.forEach(c => {
                    nextBreadcrumbNameMap.set('/' + c.key, c.label);
                });
            } else {
                nextBreadcrumbNameMap.set('/' + r.key, r.label);
            }
        });

        // 根据权限过滤菜单（创建新对象避免修改原始数据）
        const nextFilteredMenus = menus
            .filter(lv1 => hasMenu(lv1.key))
            .map(lv1 => ({
                ...lv1,
                children: lv1.children?.filter(lv2 => hasMenu(lv2.key))
            }));

        setFilteredMenus(nextFilteredMenus);
        setBreadcrumbNameMap(nextBreadcrumbNameMap);
    }, [menuKeys, t]);

    return {filteredMenus, breadcrumbNameMap};
}
