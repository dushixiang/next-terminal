import {useTranslation} from 'react-i18next';
import {getMenus} from '@/layout/menus.tsx';
import {hasMenu} from '@/utils/permission.ts';

type AppMenuItem = ReturnType<typeof getMenus>[number];

/** 根据可见子项过滤分组，生成页面名称映射。 */
export function useFilteredMenus() {
    const {t} = useTranslation();
    const menus = getMenus(t);
    const breadcrumbNameMap = new Map<string, string>();
    const collectBreadcrumbs = (items: AppMenuItem[]) => {
        for (const item of items) {
            if (item.children) {
                collectBreadcrumbs(item.children);
            } else {
                breadcrumbNameMap.set('/' + item.key, item.label);
            }
        }
    };
    collectBreadcrumbs(menus);
    breadcrumbNameMap.set('/agent-access', t('agent_access.title'));

    const filterMenus = (items: AppMenuItem[]): AppMenuItem[] => {
        return items.flatMap<AppMenuItem>(item => {
            if (item.children) {
                const children = filterMenus(item.children);
                return children.length > 0 ? [{...item, children}] : [];
            }
            return hasMenu(item.key) ? [item] : [];
        });
    };

    return {filteredMenus: filterMenus(menus), breadcrumbNameMap};
}
