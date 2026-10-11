import React from 'react';
import {Layout, Menu, MenuProps} from 'antd';
import LayoutSidebarLogo from './LayoutSidebarLogo';
import {ScrollArea} from '@/components/ui/scroll-area';

interface DesktopSidebarProps {
    collapsed: boolean;
    onCollapse: (collapsed: boolean) => void;
    isDarkMode: boolean;
    filteredMenus: MenuProps['items'];
    current: string;
    stateOpenKeys: string[];
    onSubMenuChange: (keys: string[]) => void;
    onMenuClick: (e: any) => void;
    backgroundColor: string;
}

/**
 * 桌面端侧边栏组件
 * 包含 Logo 和 Menu，支持折叠
 */
const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
                                                           collapsed,
                                                           onCollapse,
                                                           isDarkMode,
                                                           filteredMenus,
                                                           current,
                                                           stateOpenKeys,
                                                           onSubMenuChange,
                                                           onMenuClick,
                                                           backgroundColor,
                                                       }) => {
    return (
        <Layout.Sider
            collapsible
            collapsed={collapsed}
            onCollapse={onCollapse}
            className="h-dvh x-side z-10"
            theme={isDarkMode ? 'dark' : 'light'}
            style={{
                backgroundColor,
                position: 'fixed',
            }}
        >
            <div className={'flex flex-col h-full'}>
                {/* Logo 区域 */}
                <div className={'flex-none'}>
                    <LayoutSidebarLogo collapsed={collapsed}/>
                </div>

                {/* 菜单区域 */}
                <div className={'flex-1 overflow-hidden'}>
                    <ScrollArea className="h-full [&>div>div]:!block">
                        <Menu
                            className="app-navigation-menu"
                            inlineIndent={16}
                            onClick={onMenuClick}
                            selectedKeys={[current]}
                            onOpenChange={onSubMenuChange}
                            openKeys={stateOpenKeys}
                            mode="inline"
                            items={filteredMenus}
                            style={{
                                backgroundColor: 'transparent',
                            }}
                        />
                    </ScrollArea>
                </div>
            </div>
        </Layout.Sider>
    );
};

export default DesktopSidebar;
