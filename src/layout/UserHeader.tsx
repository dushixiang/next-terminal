import React from 'react';
import {Link, useLocation, useNavigate} from "react-router-dom";
import {useQuery} from "@tanstack/react-query";
import brandingApi from "@/src/api/branding-api";
import {Dropdown, Spin} from "antd";
import accountApi from "@/src/api/account-api";
import {isMobileByMediaQuery, openOrSwitchToPage} from "@/src/utils/utils";
import {ChevronDownIcon, LaptopIcon} from "lucide-react";
import {useTranslation} from "react-i18next";

const UserHeader = () => {

    let {t} = useTranslation();

    let location = useLocation();
    let navigate = useNavigate();
    let pathname = location.pathname;

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
            label: <Link to={'/x-info'}>{t('account.profile')}</Link>,
        },
        {
            key: 'logout',
            danger: true,
            label: <div onClick={logout}>{t('account.logout')}</div>,
        }
    ];

    const menus = [
        {
            key: '/x-asset',
            title: t('menus.resource.submenus.asset'),
        },
        {
            key: '/x-snippet',
            title: t('menus.resource.submenus.snippet'),
        },
    ]

    return (
        <div
            className={'sticky top-0 z-50 w-full bg-[#1A73E8] header-shadow'}>
            <div className="h-14 flex gap-8 items-center px-4 lg:px-20">
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

                {!isMobileByMediaQuery() &&
                    <div className={'cursor-pointer'}
                         onClick={() => {
                             const url = `/access`;
                             openOrSwitchToPage(url, 'NT_Access');
                         }}
                    >
                        <LaptopIcon className={'w-5 h-5 text-white'}/>
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
    );
};

export default UserHeader;