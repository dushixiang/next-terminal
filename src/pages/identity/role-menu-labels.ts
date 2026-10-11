import type {i18n, TFunction} from 'i18next';
import type {TreeNode} from '@/api/role-api';

export const localizeRoleMenus = (
    menus: TreeNode[],
    t: TFunction,
    translations: Pick<i18n, 'exists'>,
    parent = '',
): TreeNode[] => menus.map(menu => {
    const key = menu.key.replaceAll('-', '_');
    const translationKey = parent
        ? `menus.${parent.replaceAll('-', '_')}.submenus.${key}`
        : `menus.${key}.label`;
    return {
        ...menu,
        title: translations.exists(translationKey) ? t(translationKey) : menu.title,
        ...(menu.children ? {children: localizeRoleMenus(menu.children, t, translations, menu.key)} : {}),
    };
});
