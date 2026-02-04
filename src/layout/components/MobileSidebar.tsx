import React from 'react';
import {Drawer, Menu, MenuProps} from 'antd';
import LayoutSidebarLogo from './LayoutSidebarLogo';
import {ScrollArea} from '@/components/ui/scroll-area';

interface MobileSidebarProps {
    visible: boolean;
    onClose: () => void;
    filteredMenus: MenuProps['items'];
    current: string;
    stateOpenKeys: string[];
    onSubMenuChange: (keys: string[]) => void;
    onMenuClick: (e: any) => void;
}

/**
 * 移动端侧边栏组件（抽屉菜单）
 * 包含 Logo 和 Menu
 */
const MobileSidebar: React.FC<MobileSidebarProps> = ({
                                                         visible,
                                                         onClose,
                                                         filteredMenus,
                                                         current,
                                                         stateOpenKeys,
                                                         onSubMenuChange,
                                                         onMenuClick,
                                                     }) => {
    return (
        <Drawer
            title={null}
            placement="left"
            onClose={onClose}
            open={visible}
            styles={{
                body: {padding: 0}
            }}
            width={280}
            className="mobile-menu-drawer"
        >
            <div className={'flex flex-col h-full'}>
                {/* Logo 区域 */}
                <div className={'flex-none'}>
                    <LayoutSidebarLogo collapsed={false}/>
                </div>

                {/* 菜单区域 */}
                <div className={'flex-1 overflow-hidden'}>
                    <ScrollArea className="h-full">
                        <Menu
                            onClick={onMenuClick}
                            selectedKeys={[current]}
                            onOpenChange={onSubMenuChange}
                            defaultOpenKeys={stateOpenKeys}
                            openKeys={stateOpenKeys}
                            mode="inline"
                            defaultSelectedKeys={['']}
                            items={filteredMenus}
                            style={{
                                backgroundColor: 'transparent',
                            }}
                        />
                    </ScrollArea>
                </div>
            </div>
        </Drawer>
    );
};

export default MobileSidebar;
