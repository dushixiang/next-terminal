import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useQuery} from "@tanstack/react-query";
import portalApi, {DatabaseAssetUser} from "@/api/portal-api";
import {Button, Empty, Tag, Typography} from "antd";
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import {useMobile} from "@/hook/use-mobile";
import clsx from "clsx";
import strings from "@/utils/strings";
import {Search, X} from "lucide-react";
import {getCurrentUser} from "@/utils/permission";

const {Paragraph} = Typography;

const DatabaseAssetFacadePage = () => {
    const {t} = useTranslation();
    const {isMobile} = useMobile();
    const [assets, setAssets] = useState<DatabaseAssetUser[]>([]);
    const [search, setSearch] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('');

    const queryAssets = useQuery({
        queryKey: ['my-database-assets'],
        queryFn: () => portalApi.databaseAssets(),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
    const queryProperties = useQuery({
        queryKey: ['db-proxy-info'],
        queryFn: () => portalApi.getDbProxyInfo(),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    useEffect(() => {
        if (queryAssets.data) {
            setAssets(queryAssets.data);
        }
    }, [queryAssets.data]);

    const handleSearch = useCallback((value: string) => {
        setSearch(value.toLowerCase());
    }, []);

    const filteredAssets = useMemo(() => {
        let filtered = assets || [];
        if (strings.hasText(search)) {
            filtered = filtered.filter(item => {
                if (item.name.toLowerCase().includes(search)) {
                    return true;
                }
                if (item.type?.toLowerCase().includes(search)) {
                    return true;
                }
                return item.tags?.some(tag => tag.toLowerCase().includes(search));
            });
        }
        if (typeFilter) {
            filtered = filtered.filter(item => item.type === typeFilter);
        }
        return filtered;
    }, [assets, search, typeFilter]);

    const renderTypeTag = (type: string) => {
        if (type === 'mysql') {
            return <Tag color="blue">{t('db.asset.type_mysql')}</Tag>;
        }
        if (type === 'pg') {
            return <Tag color="purple">{t('db.asset.type_pg')}</Tag>;
        }
        return <Tag>{type}</Tag>;
    };

    const proxyAccess = useMemo(() => {
        const info = queryProperties.data;
        if (!info) {
            return {
                host: '<proxy_host>',
                port: '<proxy_port>',
            };
        }
        return {
            host: info.host || '<proxy_host>',
            port: info.port || '<proxy_port>',
        };
    }, [queryProperties.data]);
    const currentUsername = getCurrentUser()?.username || '<username>';

    const buildCommand = (asset: DatabaseAssetUser) => {
        return `mysql -h ${proxyAccess.host} -P ${proxyAccess.port} -u ${currentUsername}@${asset.name} -p`;
    };

    return (
        <div className="pb-6">
            <div className={clsx('lg:px-20 px-4', isMobile && 'px-2')}>
                <div className={clsx('lg:py-6 py-4', isMobile && 'pt-4')}>
                    <div className={'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3'}>
                        <div className={'flex flex-col gap-1'}>
                            <div className={'text-xl font-bold text-slate-900 dark:text-slate-100'}>
                                {t('menus.resource.submenus.database_asset')}
                            </div>
                            <div className={'text-xs text-slate-500 dark:text-slate-400'}>
                                {t('facade.database_access_tip')}
                            </div>
                        </div>
                        <Link to={'/x-db-work-order'}>
                            <Button type="primary">{t('facade.database_access_work_order')}</Button>
                        </Link>
                    </div>

                    <div className={'pt-4'}>
                        <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 p-3 lg:p-4 shadow-sm">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Search className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={search}
                                        placeholder={t('facade.database_asset_placeholder')}
                                        className="w-full rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-white dark:bg-[#141414] pl-10 pr-16 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60"
                                        onChange={(e) => handleSearch(e.target.value)}
                                    />
                                    <div className="absolute inset-y-0 right-2 flex items-center gap-2 text-xs text-slate-500">
                                        <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5">
                                            {filteredAssets.length}/{assets.length}
                                        </span>
                                        {search && (
                                            <button
                                                onClick={() => handleSearch('')}
                                                className="rounded-md p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800"
                                                aria-label={t('facade.clear_search')}
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <button
                                        onClick={() => setTypeFilter('')}
                                        className={clsx(
                                            'px-3 py-1.5 rounded-full border transition-colors',
                                            typeFilter === ''
                                                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                                        )}
                                    >
                                        {t('general.all')}
                                    </button>
                                    <button
                                        onClick={() => setTypeFilter('mysql')}
                                        className={clsx(
                                            'px-3 py-1.5 rounded-full border transition-colors',
                                            typeFilter === 'mysql'
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                                        )}
                                    >
                                        {t('db.asset.type_mysql')}
                                    </button>
                                    <button
                                        onClick={() => setTypeFilter('pg')}
                                        className={clsx(
                                            'px-3 py-1.5 rounded-full border transition-colors',
                                            typeFilter === 'pg'
                                                ? 'bg-purple-600 text-white border-purple-600'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                                        )}
                                    >
                                        {t('db.asset.type_pg')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {queryAssets.isLoading ? (
                    <div className={'text-sm text-slate-500 dark:text-slate-400'}>{t('general.loading')}</div>
                ) : filteredAssets.length === 0 ? (
                    <Empty />
                ) : (
                    <div className={'grid 2xl:grid-cols-4 lg:grid-cols-3 gap-4'}>
                        {filteredAssets.map(item => (
                            <div
                                key={item.id}
                                className={'rounded-xl bg-white dark:bg-[#141414] ring-1 ring-slate-200/60 dark:ring-slate-700/60 p-4 shadow-sm'}
                            >
                                <div className={'flex items-center justify-between gap-2'}>
                                    <div className={'text-sm font-semibold text-slate-900 dark:text-slate-100 truncate'}>
                                        {item.name}
                                    </div>
                                    {renderTypeTag(item.type)}
                                </div>
                                {item.description && (
                                    <div className={'mt-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-2'}>
                                        {item.description}
                                    </div>
                                )}
                                {item.tags && item.tags.length > 0 && (
                                    <div className={'mt-2 flex flex-wrap gap-1.5'}>
                                        {item.tags.map(tag => (
                                            <span
                                                key={tag}
                                                className={'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ring-1 ring-slate-200/50 dark:ring-slate-700/50'}
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className={'mt-3 pt-2 border-t border-slate-100 dark:border-slate-800'}>
                                    <div className={'text-xs text-slate-500 dark:text-slate-400'}>
                                        {t('db.proxy.usage_client')}
                                    </div>
                                    <Paragraph copyable className={'font-mono text-xs'} style={{marginBottom: 0}}>
                                        {buildCommand(item)}
                                    </Paragraph>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DatabaseAssetFacadePage;
