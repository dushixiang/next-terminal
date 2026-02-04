import {useEffect, useState} from 'react';
import {useMobile} from '@/hook/use-mobile.ts';

/**
 * 侧边栏状态管理 Hook
 * 管理侧边栏的折叠状态、移动端菜单可见性、菜单展开键等
 */
export function useSidebarState() {
    const {isMobile} = useMobile();

    // 侧边栏折叠状态
    const [collapsed, setCollapsed] = useState(false);

    // 移动端菜单可见性
    const [mobileMenuVisible, setMobileMenuVisible] = useState(false);

    // 菜单展开键（从 sessionStorage 读取）
    const [stateOpenKeys, setStateOpenKeys] = useState<string[]>(
        JSON.parse(sessionStorage.getItem('openKeys') || '[]')
    );

    // 移动端自动收起侧边栏
    useEffect(() => {
        if (isMobile) {
            setCollapsed(true);
        }
    }, [isMobile]);

    // 子菜单展开/折叠处理（同步到 sessionStorage）
    const subMenuChange = (openKeys: string[]) => {
        setStateOpenKeys(openKeys);
        sessionStorage.setItem('openKeys', JSON.stringify(openKeys));
    };

    return {
        collapsed,
        setCollapsed,
        mobileMenuVisible,
        setMobileMenuVisible,
        stateOpenKeys,
        subMenuChange,
    };
}
