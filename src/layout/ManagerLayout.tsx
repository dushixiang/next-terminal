import React, {Suspense, useRef} from 'react';
import {App as AntdApp, ConfigProvider, Layout} from "antd";
import {Outlet, useLocation, useNavigate} from "react-router-dom";
import {StyleProvider} from '@ant-design/cssinjs';
import {useQuery} from "@tanstack/react-query";
import clsx from 'clsx';
import i18n from "i18next";

// Hooks
import {useMobile} from "@/hook/use-mobile";
import {useNTTheme} from "@/hook/use-theme";
import {useThemeToggle} from "@/layout/hooks/use-theme-toggle.ts";
import {useBreadcrumb} from "@/layout/hooks/use-breadcrumb.tsx";
import {useManagerEventListeners} from "@/layout/hooks/use-manager-event-listeners.ts";
import {useSidebarState} from "@/layout/hooks/use-sidebar-state.ts";
import {useFilteredMenus} from "@/layout/hooks/use-filtered-menus.ts";
import {useUserDropdownMenu} from "@/layout/hooks/use-user-dropdown-menu.tsx";

// Components
import DesktopSidebar from "./components/DesktopSidebar";
import MobileSidebar from "./components/MobileSidebar";
import LayoutHeader from "./components/LayoutHeader";
import FooterComponent from "./FooterComponent";
import Landing from "../components/Landing";

// APIs
import accountApi from "@/api/account-api";
import {translateI18nToAntdLocale} from "@/helper/lang";

// Styles
import './ManagerLayout.css';

const ManagerLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // 主题和响应式
    const [ntTheme] = useNTTheme();
    const {isMobile} = useMobile();

    // 主题切换
    const themeToggleRef = useRef<HTMLButtonElement>(null);
    const {isDarkMode, toggleDarkMode} = useThemeToggle(themeToggleRef);

    // 侧边栏状态
    const {
        collapsed,
        setCollapsed,
        mobileMenuVisible,
        setMobileMenuVisible,
        stateOpenKeys,
        subMenuChange,
    } = useSidebarState();

    // 菜单和面包屑
    const {filteredMenus, breadcrumbNameMap} = useFilteredMenus();
    const {breakItems} = useBreadcrumb(breadcrumbNameMap);
    const {dropMenus} = useUserDropdownMenu();

    // 事件监听
    const {contextHolder} = useManagerEventListeners();

    // 用户信息
    const infoQuery = useQuery({
        queryKey: ['infoQuery'],
        queryFn: accountApi.getUserInfo,
    });

    const current = location.pathname.split('/')[1];

    // 菜单点击处理
    const handleMenuClick = (e: any) => {
        navigate(e.key);
        infoQuery.refetch();
        if (isMobile) {
            setMobileMenuVisible(false);
        }
    };

    return (
        <StyleProvider hashPriority="high">
            <ConfigProvider
                theme={{
                    algorithm: ntTheme.algorithm,
                    components: {
                        Layout: {
                            triggerBg: '#131313',
                        }
                    }
                }}
                locale={translateI18nToAntdLocale(i18n.language)}
            >
                <AntdApp>
                    <Layout
                        hasSider={!isMobile}
                        style={{
                            backgroundColor: ntTheme.backgroundColor,
                        }}
                    >
                        {/* 桌面端侧边栏 */}
                        {!isMobile && (
                            <DesktopSidebar
                                collapsed={collapsed}
                                onCollapse={setCollapsed}
                                isDarkMode={isDarkMode}
                                filteredMenus={filteredMenus}
                                current={current}
                                stateOpenKeys={stateOpenKeys}
                                onSubMenuChange={subMenuChange}
                                onMenuClick={handleMenuClick}
                                backgroundColor={ntTheme.backgroundColor}
                            />
                        )}

                        {/* 移动端抽屉菜单 */}
                        <MobileSidebar
                            visible={isMobile && mobileMenuVisible}
                            onClose={() => setMobileMenuVisible(false)}
                            filteredMenus={filteredMenus}
                            current={current}
                            stateOpenKeys={stateOpenKeys}
                            onSubMenuChange={subMenuChange}
                            onMenuClick={handleMenuClick}
                        />

                        <div
                            className={'flex-grow flex flex-col min-h-screen min-w-0'}
                            style={{
                                marginLeft: isMobile ? 0 : (collapsed ? 80 : 200),
                            }}
                        >
                            {/* 头部导航栏 */}
                            <LayoutHeader
                                isMobile={isMobile}
                                breakItems={breakItems}
                                onMobileMenuOpen={() => setMobileMenuVisible(true)}
                                isDarkMode={isDarkMode}
                                onThemeToggle={toggleDarkMode}
                                themeToggleRef={themeToggleRef}
                                userInfo={infoQuery.data}
                                dropMenus={dropMenus}
                            />

                            {/* 主内容区域 */}
                            <Suspense fallback={<Landing/>}>
                                <div className={clsx('flex-grow', {
                                    'mx-2': isMobile,
                                    'mx-4': !isMobile
                                })}>
                                    <Outlet/>
                                </div>
                            </Suspense>

                            {/* 页脚 */}
                            <FooterComponent/>
                        </div>
                        {contextHolder}
                    </Layout>
                </AntdApp>
            </ConfigProvider>
        </StyleProvider>
    );
};

export default ManagerLayout;
