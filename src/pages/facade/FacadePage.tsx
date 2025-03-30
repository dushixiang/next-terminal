import React, {useEffect, useState} from 'react';
import {useQuery} from "@tanstack/react-query";
import portalApi, {AssetUser} from "@/src/api/portal-api";
import './FacadePage.css';
import strings from "@/src/utils/strings";
import clsx from "clsx";
import {Search} from "lucide-react";
import {Badge, Popover, Tooltip, Typography} from "antd";
import {useTranslation} from "react-i18next";
import {accessAsset} from "@/src/helper/access-tab-channel";
import {getImgColor, getProtocolColor} from "@/src/helper/asset-helper";
import {isMobileByMediaQuery, openOrSwitchToPage} from "@/src/utils/utils";
import {safeEncode} from "@/src/utils/codec";

const FacadePage = () => {

    let {t} = useTranslation();
    let [assets, setAssets] = useState<AssetUser[]>();
    let [search, setSearch] = useState<string>('');

    let queryAssets = useQuery({
        queryKey: ['my-assets'],
        queryFn: () => portalApi.assets()
    });

    useEffect(() => {
        if (queryAssets.data) {
            setAssets(queryAssets.data);
        }
    }, [queryAssets.data]);

    const renderImg = (item: AssetUser) => {
        if (item.logo === "") {
            return <div
                className={clsx(`w-12 h-12 rounded-md flex items-center justify-center font-bold text-white`, getImgColor(item.protocol))}>
                {item.name[0]}
            </div>
        } else {
            return <div className={'w-12 h-12'}>
                <img className={'w-12 h-12'} src={item.logo} alt={'logo'} loading="eager"/>
            </div>
        }
    }

    const handleSearch = (e) => {
        let value = e.target.value;
        setSearch(value.toLowerCase());
    }

    const renderUser = (record: AssetUser) => {
        if (record.users && record.users.length > 0) {
            return <Tooltip title={record.users.join("\n")}>
                <Badge status="processing" size={'small'} text={
                    <span className={'text-xs'}>{t('facade.accessing')}</span>
                }/>
            </Tooltip>
        }
        return '';
    }

    return (
        <div>
            <div className={'lg:px-20 px-4'}>
                <div className={'lg:py-6 py-4 flex'}>
                    <div className={'flex-grow text-xl font-bold'}>
                        {t('menus.resource.submenus.asset')}
                    </div>
                </div>

                <div className={'pb-4'}>
                    <div className="relative">
                        <div className={'absolute inset-y-0 grid place-content-center'}>
                            <Search className={'h-4 w-10 text-gray-500'}/>
                        </div>
                        <input
                            type="text"
                            id="Search"
                            placeholder={t('facade.asset_placeholder')}
                            className="w-full rounded-md pl-8 py-2.5 pe-10 shadow-sm border-2 border-transparent  focus:outline-none"
                            onChange={handleSearch}
                        />
                    </div>
                </div>

                <div className={'rounded-lg'}>
                    <div className={'grid 2xl:grid-cols-5 lg:grid-cols-4 lg:gap-6 grid-cols-1 gap-2'}>
                        {assets?.filter(item => {
                            if (!strings.hasText(search)) {
                                return true;
                            }
                            if (item.name.toLowerCase().includes(search)) {
                                return true;
                            }
                            if (item.protocol.toLowerCase().includes(search)) {
                                return true;
                            }
                            return item.tags?.some(tag => {
                                return tag.toLowerCase().includes(search)
                            });

                        }).map(item => {
                            const id = item.id;
                            const protocol = item.protocol;

                            let props;
                            switch (protocol) {
                                case 'http':
                                    let url1 = `/browser?websiteId=${id}&t=${new Date().getTime()}`
                                    props = {
                                        href: url1,
                                        target: '_blank',
                                    }
                                    break;
                                default:
                                    if (isMobileByMediaQuery()) {
                                        switch (protocol) {
                                            case "ssh":
                                                let url1 = `/mobile-terminal?assetId=${id}&t=${new Date().getTime()}`
                                                props = {
                                                    href: url1,
                                                    target: '_blank',
                                                }
                                        }
                                    } else {
                                        props = {
                                            onClick: () => {
                                                let msg = {
                                                    id: id,
                                                    name: item['name'],
                                                    protocol: item['protocol'],
                                                }
                                                const url = `/access?asset=${safeEncode(msg)}`;
                                                openOrSwitchToPage(url, 'NT_Access');
                                                accessAsset(msg);
                                            }
                                        }
                                        break
                                    }
                            }

                            return <a key={item.id}
                                      className={'cursor-pointer'}
                                      {...props}
                            >
                                <div className={clsx(
                                    'flex items-center justify-center relative'
                                    , item.status === 'inactive' && 'filter grayscale'
                                )}>
                                    <div
                                        className={clsx('flex-grow bg-white flex gap-2 items-center px-4 py-3 rounded-md relative')}>
                                        <div className={'flex-grow-0'}>
                                            {renderImg(item)}
                                        </div>
                                        <div className={'flex-grow flex flex-col gap-1 text-xs'}>
                                            <div className={'font-medium'}>{item.name}</div>
                                            <Popover content={<div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    return false;
                                                }}>
                                                <Typography.Paragraph copyable style={{marginBottom: 0}}>{item.description}</Typography.Paragraph>
                                            </div>}>
                                                <div className={'text-gray-400 line-clamp-1'}>{item.description}</div>
                                            </Popover>
                                            <div className={'text-gray-400 flex flex-wrap gap-1'}>
                                                {item.tags?.map(tag => {
                                                    return <span key={tag}
                                                                 className={'inline-flex items-center justify-center rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-700'}>
                              {tag}
                            </span>
                                                })}
                                            </div>
                                        </div>
                                        <div className={'absolute top-1 right-2 flex gap-2'}>
                                            {renderUser(item)}
                                            {/*{renderStatus(item)}*/}
                                        </div>
                                    </div>

                                    <span
                                        className={clsx('absolute bottom-0 right-0 whitespace-nowrap rounded-tl-md rounded-br-md px-1.5 py-0.5 text-white font-bold', getProtocolColor(item.protocol))}
                                        style={{fontSize: 9,}}>
                                        {item.protocol.toUpperCase()}
                                    </span>
                                </div>
                            </a>
                        })}
                    </div>


                </div>

            </div>
        </div>
    );
};

export default FacadePage;