import React, {useState} from 'react';
import {Link, useLocation, useNavigate} from "react-router-dom";
import {useQuery} from "@tanstack/react-query";
import brandingApi from "@/src/api/branding-api";
import {Drawer, Dropdown, Menu, Select, Spin} from "antd";
import accountApi from "@/src/api/account-api";
import {isMobileByMediaQuery, openOrSwitchToPage} from "@/src/utils/utils";
import {
    ChevronDownIcon,
    LanguagesIcon,
    LaptopIcon,
    LayoutDashboard, LogOutIcon, MenuIcon, UserIcon
} from "lucide-react";
import {useTranslation} from "react-i18next";
import i18n from "i18next";
import {useMobile} from "@/src/hook/use-mobile";

const UserHeader = () => {

    let {t} = useTranslation();
    const {isMobile} = useMobile();

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
            key: '/x-snippet',
            title: t('menus.resource.submenus.snippet'),
        },
    ]

    return (
        <>
            <div
                className={'sticky top-0 z-50 w-full bg-[#1A73E8] header-shadow'}>
                <div className="h-14 flex gap-2 lg:gap-8 items-center px-4 lg:px-20">
                    {/* 移动端汉堡菜单图标 */}
                    {isMobile && (
                        <div 
                            className={'cursor-pointer text-white'}
                            onClick={() => setMobileMenuVisible(true)}
                        >
                            <MenuIcon className={'w-6 h-6'} />
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
                                        className={`h-full flex items-center cursor-pointer relative ${item.key == pathname && 'header-menu-selected'}`}
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
                        <div className={'flex items-center gap-1'}>
                            <Select
                                placeholder="Language"
                                variant="borderless"
                                style={{
                                    width: 120,
                                }}
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

                            <div className={'cursor-pointer'}
                                 onClick={() => {
                                     const url = `/access`;
                                     openOrSwitchToPage(url, 'NT_Access');
                                 }}
                            >
                                <LaptopIcon className={'w-5 h-5 text-white'}/>
                            </div>
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
                    body: {padding: 0}
                }}
                width={280}
                className="mobile-menu-drawer"
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
                    <div className={'flex-none border-t p-4 space-y-3'}>
                        {/* 语言选择 */}
                        <div>
                            <div className={'text-xs text-gray-500 mb-2'}>
                                {t('general.language')}
                            </div>
                            <Select
                                placeholder="Language"
                                style={{
                                    width: '100%',
                                }}
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
                        </div>

                        {/* 访问页面按钮 */}
                        <div 
                            className={'flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-100'}
                            onClick={() => {
                                const url = `/access`;
                                openOrSwitchToPage(url, 'NT_Access');
                                setMobileMenuVisible(false);
                            }}
                        >
                            <LaptopIcon className={'w-5 h-5'}/>
                            <span>{t('menus.access.label')}</span>
                        </div>
                    </div>
                </div>
            </Drawer>
        </>
    );
};

export default UserHeader;