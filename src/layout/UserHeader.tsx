import React, {useRef, useState} from 'react';
import {Link, useLocation, useNavigate} from "react-router-dom";
import {useQuery} from "@tanstack/react-query";
import brandingApi from "@/api/branding-api";
import {Drawer, Dropdown, Menu, Select, Spin} from "antd";
import accountApi from "@/api/account-api";
import {
    ChevronDownIcon,
    LanguagesIcon,
    LaptopIcon,
    LayoutDashboard,
    LogOutIcon,
    MenuIcon,
    Moon,
    Sun,
    UserIcon
} from "lucide-react";
import {useTranslation} from "react-i18next";
import i18n from "i18next";
import {useMobile} from "@/hook/use-mobile";
import clsx from "clsx";
import {useThemeToggle} from "@/layout/hooks/use-theme-toggle";

const UserHeader = () => {

    let {t} = useTranslation();
    const {isMobile} = useMobile();
    const themeToggleRef = useRef<HTMLButtonElement>(null);
    const {isDarkMode, toggleDarkMode} = useThemeToggle(themeToggleRef);
    const isDark = isDarkMode;

    let location = useLocation();
    let navigate = useNavigate();
    let pathname = location.pathname;

    const [mobileMenuVisible, setMobileMenuVisible] = useState(false);

    let brandingQuery = useQuery({
        queryKey: ['branding'],
        queryFn: brandingApi.getBranding,
    });


    let infoQuery = useQuery({
        queryKey: ['info'],
        queryFn: accountApi.getUserInfo
    });


    const logout = async () => {
        await accountApi.logout();
        window.location.href = '/login';
    }

    const dropItems = [
        {
            key: 'info-center',
            icon: <UserIcon className={'w-4 h-4'}/>,
            label: <Link to={'/x-info'}>{t('account.profile')}</Link>,
            danger: false,
        },

    ];

    if (infoQuery.data?.type === 'admin' || infoQuery.data?.type === 'super-admin') {
        dropItems.push({
            key: 'admin',
            icon: <LayoutDashboard className={'w-4 h-4'}/>,
            label: <Link to={'/dashboard'}>{t('menus.dashboard.label')}</Link>,
            danger: false,
        });
    }

    dropItems.push({
        key: 'logout',
        icon: <LogOutIcon className={'w-4 h-4'}/>,
        danger: true,
        label: <div onClick={logout}>{t('account.logout')}</div>,
    })


    const menus = [
        {
            key: '/x-asset',
            title: t('menus.resource.submenus.asset'),
        },
        {
            key: '/x-website',
            title: t('menus.resource.submenus.website'),
        },
        {
            key: '/x-database-asset',
            title: t('menus.resource.submenus.database_asset'),
        },
        {
            key: '/x-snippet',
            title: t('menus.resource.submenus.snippet'),
        },
        {
            key: '/x-db-work-order',
            title: t('menus.resource.submenus.db_work_order'),
        },
    ]

    return (
        <>
            <div
                className={clsx(
                    'sticky top-0 z-50 w-full border-b shadow-[0_6px_18px_rgba(15,23,42,0.18)]',
                    isDark
                        ? 'bg-gradient-to-r from-[#0b1f3a] via-[#0f2a50] to-[#143a6b] border-white/10'
                        : 'bg-gradient-to-r from-[#1A73E8] via-[#1E7BF2] to-[#3B82F6] border-white/20'
                )}
            >
                <div className="h-14 flex gap-2 lg:gap-8 items-center px-4 lg:px-20 text-white">
                    {/* 移动端汉堡菜单图标 */}
                    {isMobile && (
                        <div
                            className={'cursor-pointer text-white'}
                            onClick={() => setMobileMenuVisible(true)}
                        >
                            <MenuIcon className={'w-6 h-6'}/>
                        </div>
                    )}

                    <Spin spinning={brandingQuery.isLoading}>
                        <Link to={'/x-asset'}>
                            <div className={'flex-none flex gap-2 items-center'}>
                                {
                                    brandingQuery.data ?
                                        <img src={brandingApi.getLogo()} alt='logo' className={'w-8 h-8 rounded-md'}/> :
                                        undefined
                                }
                                <div className={'font-bold text-base text-white'}>
                                    {brandingQuery.data?.name}
                                </div>
                            </div>
                        </Link>
                    </Spin>


                    <div className={'flex-grow h-full'}>
                        <div className={'lg:flex gap-6 items-center h-full text-sm text-white hidden'}>
                            {
                                menus.map(item => {
                                    return <div
                                        key={item.key}
                                        className={clsx(
                                            'h-full flex items-center cursor-pointer relative px-1.5 transition-colors',
                                            item.key === pathname
                                                ? 'text-white font-semibold after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-full after:bg-white/90'
                                                : 'text-white/80 hover:text-white'
                                        )}
                                        onClick={() => {
                                            navigate(item.key)
                                        }}>
                                        <div className={'items-center'}>
                                            {item.title}
                                        </div>
                                    </div>
                                })
                            }
                        </div>
                    </div>


                    {!isMobile &&
                        <div className={'flex items-center gap-2'}>
                            <Select
                                placeholder={t('general.language')}
                                variant="borderless"
                                className="text-white [&_.ant-select-selector]:!bg-white/10 [&_.ant-select-selector]:!text-white [&_.ant-select-selection-item]:!text-white [&_.ant-select-selection-placeholder]:!text-white/70 [&_.ant-select-arrow]:!text-white"
                                style={{
                                    width: 120,
                                }}
                                prefix={<LanguagesIcon className={'w-4 h-4'}/>}
                                options={[
                                    {value: 'en-US', label: t('general.language_en_us')},
                                    {value: 'zh-CN', label: t('general.language_zh_cn')},
                                    {value: 'zh-TW', label: t('general.language_zh_tw')},
                                    {value: 'ja-JP', label: t('general.language_ja_jp')},
                                ]}
                                value={i18n.language}
                                onChange={(value) => {
                                    i18n.changeLanguage(value);
                                }}
                            />

                            <button
                                ref={themeToggleRef}
                                type="button"
                                onClick={() => toggleDarkMode(!isDarkMode)}
                                className="cursor-pointer h-8 w-8 rounded-md border border-white/30 bg-white/10 text-white/90 transition-colors hover:bg-white/20 hover:text-white"
                            >
                                {isDarkMode ? <Sun className="h-4 w-4 mx-auto"/> : <Moon className="h-4 w-4 mx-auto"/>}
                            </button>

                            <button
                                className={'cursor-pointer h-8 w-8 rounded-md border border-white/30 bg-white/10 text-white/90 transition-colors hover:bg-white/20 hover:text-white'}
                                onClick={() => {
                                    window.open('/access', '_blank');
                                }}
                            >
                                <LaptopIcon className={'w-4 h-4 mx-auto'}/>
                            </button>

                        </div>
                    }


                    <Dropdown menu={{items: dropItems}}>
                        <div className={'flex gap-2 items-center cursor-pointer h-full text-white'}>
                            <div className={'text-sm '}>{infoQuery.data?.nickname}</div>
                            <ChevronDownIcon className={'w-5 h-5'}/>
                        </div>
                    </Dropdown>
                </div>
            </div>

            {/* 移动端抽屉菜单 */}
            <Drawer
                title={null}
                placement="left"
                onClose={() => setMobileMenuVisible(false)}
                open={isMobile && mobileMenuVisible}
                styles={{
                    body: {
                        padding: 0,
                        background: isDark ? '#0b1220' : '#ffffff',
                    }
                }}
                width={280}
                className={clsx("[&_.ant-drawer-body]:p-0", isDark ? "text-slate-100" : "text-slate-900")}
            >
                <div className={'flex flex-col h-full'}>
                    {/* Logo 区域 */}
                    <div className={'flex-none'}>
                        <Spin spinning={brandingQuery.isLoading}>
                            <Link to={'/x-asset'} onClick={() => setMobileMenuVisible(false)}>
                                <div className={'flex items-center gap-2 justify-center h-[60px]'}>
                                    {brandingQuery.data && (
                                        <img
                                            src={brandingApi.getLogo()}
                                            alt='logo'
                                            className={'h-8 w-8 rounded'}
                                        />
                                    )}
                                    <div className={'font-bold text-lg'}>
                                        {brandingQuery.data?.name}
                                    </div>
                                </div>
                            </Link>
                        </Spin>
                    </div>

                    {/* 菜单区域 */}
                    <div className={'flex-1 overflow-auto'}>
                        <Menu
                            mode="inline"
                            theme={isDark ? 'dark' : 'light'}
                            className={clsx(
                                "border-0",
                                isDark && "bg-transparent [&_.ant-menu-item]:text-slate-200 [&_.ant-menu-item-selected]:!bg-blue-500/20 [&_.ant-menu-item-selected]:!text-white"
                            )}
                            selectedKeys={[pathname]}
                            items={menus.map(item => ({
                                key: item.key,
                                label: item.title,
                                onClick: () => {
                                    navigate(item.key);
                                    setMobileMenuVisible(false);
                                }
                            }))}
                        />
                    </div>

                    {/* 底部操作区域 */}
                    <div className={'flex-none p-4 space-y-4'}>
                        {/* 语言选择 */}
                        <div>
                            <div className={clsx('mb-2 text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>
                                {t('general.language')}
                            </div>
                            <Select
                                placeholder={t('general.language')}
                                style={{
                                    width: '100%',
                                }}
                                options={[
                                    {value: 'en-US', label: t('general.language_en_us')},
                                    {value: 'zh-CN', label: t('general.language_zh_cn')},
                                    {value: 'zh-TW', label: t('general.language_zh_tw')},
                                    {value: 'ja-JP', label: t('general.language_ja_jp')},
                                ]}
                                value={i18n.language}
                                onChange={(value) => {
                                    i18n.changeLanguage(value);
                                }}
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => toggleDarkMode(!isDarkMode)}
                            className={clsx(
                                'flex items-center gap-2 p-2 rounded transition-colors',
                                isDark ? 'bg-white/5 text-slate-100 hover:bg-white/10' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                            )}
                        >
                            {isDarkMode ? <Sun className="h-4 w-4"/> : <Moon className="h-4 w-4"/>}
                        </button>
                    </div>
                </div>
            </Drawer>

        </>
    );
};

export default UserHeader;
