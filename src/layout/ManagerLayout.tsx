import React, {Suspense, useEffect, useRef, useState} from 'react';
import {
    Alert,
    App as AntdApp,
    Breadcrumb,
    Button,
    ConfigProvider,
    Drawer,
    Dropdown,
    Layout,
    Menu,
    Modal,
    Select,
    Spin,
    Switch
} from "antd";
import type {MenuProps} from "antd";
import {BugOutlined, DownOutlined, MenuOutlined, MoonOutlined, SunOutlined} from "@ant-design/icons";
import {Link, Outlet, useLocation, useNavigate} from "react-router-dom";
import FooterComponent from "./FooterComponent";
import {getMenus} from "./menus";
import Landing from "../components/Landing";
import accountApi from "../api/account-api";
import {useTranslation} from "react-i18next";
import {StyleProvider} from '@ant-design/cssinjs';
import {useQuery} from "@tanstack/react-query";
import brandingApi from "@/api/branding-api";
import {hasMenu} from "@/utils/permission";
import clsx from "clsx";
import './ManagerLayout.css'
import {flushSync} from "react-dom";
import eventEmitter from "@/api/core/event-emitter";
import {debounce} from "@/utils/debounce";
import SimpleBar from "simplebar-react";
import {DarkTheme, DefaultTheme, useNTTheme} from "@/hook/use-theme";
import {translateI18nToAntdLocale} from "@/helper/lang";
import {LanguagesIcon, LaptopIcon, LogOutIcon, UserIcon} from "lucide-react";
import {openOrSwitchToPage} from "@/utils/utils";
import {useMobile} from "@/hook/use-mobile";
import {useLicense} from "@/hook/use-license";
import Marquee from 'react-fast-marquee';
import dayjs from "dayjs";
import {baseUrl} from "@/api/core/requests";
import i18n from "i18next";
import {setThemeColor} from "@/utils/theme";

const breadcrumbNameMap = new Map<string, string>();

const ManagerLayout: React.FC = () => {
    const {t} = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    
    // Hooks
    const [ntTheme, setNTTheme] = useNTTheme();
    const [licence] = useLicense();
    const {isMobile} = useMobile();
    
    // State
    const [breakItems, setBreakItems] = useState<any[]>([]);
    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(ntTheme.isDark);
    const [stateOpenKeys, setStateOpenKeys] = useState<string[]>(
        JSON.parse(sessionStorage.getItem('openKeys') || '[]')
    );
    
    const ref = useRef<HTMLButtonElement>(null);
    const [modal, contextHolder] = Modal.useModal();

    // Queries
    const brandingQuery = useQuery({
        queryKey: ['branding'],
        queryFn: brandingApi.getBranding,
    });
    
    const infoQuery = useQuery({
        queryKey: ['infoQuery'],
        queryFn: accountApi.getUserInfo,
    });

    useEffect(() => {
        // 移动端自动收起侧边栏
        if (isMobile) {
            setCollapsed(true);
        }

        const needEnableOTP = debounce(() => {
            const mustAt = '/info?activeKey=otp';
            const href = window.location.href;
            if (!href.includes(mustAt)) {
                modal.warning({
                    title: t('general.tips'),
                    content: t('account.otp_required'),
                    onOk: () => {
                        window.location.href = mustAt;
                    }
                });
            }
        }, 500);

        const needChangePassword = debounce(() => {
            const mustAt = '/info?activeKey=change-password';
            const href = window.location.href;
            if (!href.includes(mustAt)) {
                modal.warning({
                    title: t('general.tips'),
                    content: t('general.password_expired'),
                    onOk: () => {
                        window.location.href = mustAt;
                    }
                });
            }
        }, 500);

        eventEmitter.on("API:NEED_ENABLE_OPT", needEnableOTP);
        eventEmitter.on("API:NEED_CHANGE_PASSWORD", needChangePassword);

        return () => {
            eventEmitter.off("API:NEED_ENABLE_OPT", needEnableOTP);
            eventEmitter.off("API:NEED_CHANGE_PASSWORD", needChangePassword);
        };
    }, [isMobile, modal, t]);

    const toggleDarkMode = async (isDarkMode: boolean) => {
        if (
            !ref.current ||
            !document.startViewTransition ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            setIsDarkMode(isDarkMode);
            return;
        }

        await document.startViewTransition(() => {
            flushSync(() => {
                setIsDarkMode(isDarkMode);
            });
        }).ready;

        const {top, left, width, height} = ref.current.getBoundingClientRect();
        const x = left + width / 2;
        const y = top + height / 2;
        const right = window.innerWidth - left;
        const bottom = window.innerHeight - top;
        const maxRadius = Math.hypot(
            Math.max(left, right),
            Math.max(top, bottom),
        );

        document.documentElement.animate(
            {
                clipPath: [
                    `circle(0px at ${x}px ${y}px)`,
                    `circle(${maxRadius}px at ${x}px ${y}px)`,
                ],
            },
            {
                duration: 500,
                easing: 'ease-in-out',
                pseudoElement: '::view-transition-new(root)',
            }
        );
    };

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            setThemeColor('#09090B');
            setNTTheme(DarkTheme);
        } else {
            document.documentElement.classList.remove('dark');
            setThemeColor('#fff');
            setNTTheme(DefaultTheme);
        }
    }, [isDarkMode, setNTTheme]);

    const menus = getMenus(t);
    menus.forEach(r => {
        if (r.children) {
            r.children.forEach(c => {
                breadcrumbNameMap.set('/' + c.key, c.label);
            });
        } else {
            breadcrumbNameMap.set('/' + r.key, r.label);
        }
    });

    const filteredMenus = menus
        .filter(lv1 => hasMenu(lv1.key))
        .map(lv1 => {
            lv1.children = lv1.children?.filter(lv2 => hasMenu(lv2.key));
            return lv1;
        });

    const current = location.pathname.split('/')[1];

    useEffect(() => {
        const pathSnippets = location.pathname.split('/').filter(i => i);
        const extraBreadcrumbItems = pathSnippets.map((_, index) => {
            const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
            const label = breadcrumbNameMap.get(url) || '';
            return {
                title: <Link to={url}>{label}</Link>
            };
        });

        const breadcrumbItems = [{
            title: <Link to={'/dashboard'}>{t('general.home')}</Link>
        }].concat(extraBreadcrumbItems);
        setBreakItems(breadcrumbItems);
    }, [location.pathname, t]);

    const subMenuChange = (openKeys: string[]) => {
        setStateOpenKeys(openKeys);
        sessionStorage.setItem('openKeys', JSON.stringify(openKeys));
    };

    const dropMenus = () => {
        const menus: MenuProps['items'] = [
            {
                key: 'my-asset',
                icon: <LaptopIcon className={'h-4 w-4'}/>,
                label: <Link to={'/x-asset'} target="_blank">{t('account.my_asset')}</Link>
            },
            {
                key: 'info',
                icon: <UserIcon className={'h-4 w-4'}/>,
                label: <Link to={'/info'}>{t("account.profile")}</Link>
            },
            {
                key: 'logout',
                icon: <LogOutIcon className={'h-4 w-4'}/>,
                danger: true,
                label: <div onClick={async () => {
                    await accountApi.logout();
                    window.location.href = '/login';
                }}>
                    {t('account.logout')}
                </div>
            },
        ];

        if (brandingQuery.data?.debug) {
            menus.push({
                key: 'debug',
                icon: <BugOutlined/>,
                label: <a target='_blank' rel="noreferrer"
                          href={`${baseUrl()}/debug/pprof/`}>Debug</a>,
            });
        }

        return menus;
    };

    const renderBanner = () => {
        if (!licence) {
            return null;
        }
        if (licence.isExpired()) {
            return (
                <Alert
                    type={'error'}
                    banner
                    message={
                        <Marquee pauseOnHover gradient={false}>
                            {t('errors.20002')}
                        </Marquee>
                    }
                />
            );
        }
        if (licence.isTest()) {
            return (
                <Alert
                    banner
                    message={
                        <Marquee pauseOnHover gradient={false}>
                            {t('settings.license.test_warning')}: &nbsp; {dayjs(licence.expired).format('YYYY-MM-DD HH:mm:ss')}
                        </Marquee>
                    }
                />
            );
        }
        return null;
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
                    {renderBanner()}
                    <Layout
                        hasSider={!isMobile}
                        style={{
                            backgroundColor: ntTheme.backgroundColor,
                        }}
                    >
                        {/* 桌面端侧边栏 */}
                        {!isMobile && (
                            <Layout.Sider 
                                collapsible
                                collapsed={collapsed}
                                onCollapse={setCollapsed}
                                className={'h-screen x-side z-10'}
                                theme={isDarkMode ? 'dark' : 'light'}
                                style={{
                                    height: '100vh',
                                    backgroundColor: ntTheme.backgroundColor,
                                    position: 'fixed',
                                }}
                            >
                                <div className={'flex flex-col'}>
                                    <div className={'flex-none'}>
                                        <Spin spinning={brandingQuery.isLoading}>
                                            <div className={clsx("flex items-center gap-2 justify-center h-[60px]")}>
                                                {brandingQuery.data && (
                                                    <img 
                                                        src={brandingApi.getLogo()} 
                                                        alt='logo'
                                                        className={'h-8 w-8 rounded'}
                                                    />
                                                )}
                                                {!collapsed && (
                                                    <div className={clsx('font-bold text-lg transition duration-100 ease-in-out')}>
                                                        {brandingQuery.data?.name}
                                                    </div>
                                                )}
                                            </div>
                                        </Spin>
                                    </div>

                                    <div>
                                        <SimpleBar 
                                            className=""
                                            style={{
                                                height: window.innerHeight - 72 - 48,
                                            }}
                                        >
                                            <Menu
                                                onClick={(e) => {
                                                    navigate(e.key);
                                                    infoQuery.refetch();
                                                }}
                                                selectedKeys={[current]}
                                                onOpenChange={subMenuChange}
                                                defaultOpenKeys={stateOpenKeys}
                                                openKeys={stateOpenKeys}
                                                mode="inline"
                                                defaultSelectedKeys={['']}
                                                items={filteredMenus}
                                                style={{
                                                    backgroundColor: ntTheme.backgroundColor,
                                                }}
                                            />
                                        </SimpleBar>
                                    </div>
                                </div>
                            </Layout.Sider>
                        )}

                        {/* 移动端抽屉菜单 */}
                        <Drawer
                            title={null}
                            placement="left"
                            onClose={() => setMobileMenuVisible(false)}
                            open={isMobile && mobileMenuVisible}
                            styles={{
                                body: {padding: 0}
                            }}
                            width={280}
                            className="mobile-menu-drawer"
                        >
                            <div className={'flex flex-col h-full'}>
                                <div className={'flex-none'}>
                                    <Spin spinning={brandingQuery.isLoading}>
                                        <div className={clsx("flex items-center gap-2 justify-center h-[60px]")}>
                                            {brandingQuery.data && (
                                                <img 
                                                    src={brandingApi.getLogo()} 
                                                    alt='logo'
                                                    className={'h-8 w-8 rounded'}
                                                />
                                            )}
                                            <div className={clsx('font-bold text-lg transition duration-100 ease-in-out')}>
                                                {brandingQuery.data?.name}
                                            </div>
                                        </div>
                                    </Spin>
                                </div>

                                <div className={'flex-1 overflow-hidden'}>
                                    <SimpleBar className="h-full">
                                        <Menu
                                            onClick={(e) => {
                                                navigate(e.key);
                                                infoQuery.refetch();
                                                setMobileMenuVisible(false);
                                            }}
                                            selectedKeys={[current]}
                                            onOpenChange={subMenuChange}
                                            defaultOpenKeys={stateOpenKeys}
                                            openKeys={stateOpenKeys}
                                            mode="inline"
                                            defaultSelectedKeys={['']}
                                            items={filteredMenus}
                                            style={{
                                                backgroundColor: 'transparent',
                                                border: 'none'
                                            }}
                                        />
                                    </SimpleBar>
                                </div>
                            </div>
                        </Drawer>

                        <div className={'flex-grow flex flex-col min-h-screen min-w-0'}
                             style={{
                                 marginLeft: isMobile ? 0 : (collapsed ? 80 : 200),
                             }}
                        >
                            {/* 头部导航栏 */}
                            <div className={clsx('flex items-center h-[60px] justify-between', {
                                'px-4': isMobile,
                                'px-8': !isMobile
                            })}>
                                {/* 移动端菜单按钮 */}
                                {isMobile && (
                                    <Button
                                        type="text"
                                        icon={<MenuOutlined/>}
                                        onClick={() => setMobileMenuVisible(true)}
                                        className="mr-2"
                                    />
                                )}

                                {/* 面包屑导航 - 移动端隐藏 */}
                                {!isMobile && <Breadcrumb items={breakItems}/>}

                                <div className={clsx('flex items-center', {
                                    'gap-2': isMobile,
                                    'gap-4': !isMobile
                                })}>
                                    {/* 语言选择 - 移动端简化 */}
                                    {!isMobile && (
                                        <Select
                                            placeholder="Language"
                                            variant="borderless"
                                            style={{width: 120}}
                                            prefix={<LanguagesIcon className={'w-4 h-4'}/>}
                                            options={[
                                                {value: 'en-US', label: 'English'},
                                                {value: 'zh-CN', label: '简体中文'},
                                                {value: 'zh-TW', label: '繁体中文'},
                                                {value: 'ja-JP', label: '日本語'},
                                            ]}
                                            value={i18n.language}
                                            onChange={(value) => {
                                                i18n.changeLanguage(value);
                                            }}
                                        />
                                    )}

                                    {/* 访问页面按钮 */}
                                    <div 
                                        className={'cursor-pointer'}
                                        onClick={() => {
                                            const url = `/access`;
                                            openOrSwitchToPage(url, 'NT_Access');
                                        }}
                                    >
                                        <LaptopIcon className={clsx({
                                            'w-4 h-4': isMobile,
                                            'w-5 h-5': !isMobile
                                        })}/>
                                    </div>

                                    {/* 主题切换 */}
                                    <Switch
                                        ref={ref}
                                        checkedChildren={<MoonOutlined/>}
                                        unCheckedChildren={<SunOutlined/>}
                                        checked={isDarkMode}
                                        onChange={toggleDarkMode}
                                        size={isMobile ? 'small' : undefined}
                                    />

                                    {/* 用户下拉菜单 */}
                                    <Dropdown
                                        menu={{
                                            items: dropMenus()
                                        }}
                                    >
                                        <Button
                                            type="text"
                                            icon={<DownOutlined/>}
                                            size={isMobile ? 'small' : undefined}
                                        >
                                            {isMobile ? '' : infoQuery.data?.nickname}
                                        </Button>
                                    </Dropdown>
                                </div>
                            </div>

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