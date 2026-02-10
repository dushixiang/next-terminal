import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useQuery } from "@tanstack/react-query";
import portalApi, { AssetUser, TreeDataNodeWithExtra } from "@/api/portal-api";
import strings from "@/utils/strings";
import {Empty, message} from "antd";
import { useTranslation } from "react-i18next";
import { getAllKeys, findNode, getGroupAndChildIds, checkItemInGroups } from './utils/facade-utils';
import FacadeSearchBar from './components/FacadeSearchBar';
import FacadeGroupTree from './components/FacadeGroupTree';
import FacadeCard from './components/FacadeCard';
import FacadeCardSkeleton from './components/FacadeCardSkeleton';

const WebsiteFacadePage = () => {

    let {t} = useTranslation();
    let [websites, setWebsites] = useState<AssetUser[]>();
    let [search, setSearch] = useState<string>('');
    let [selectedGroupKey, setSelectedGroupKey] = useState<string>('');
    let [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
    let [allowLoading, setAllowLoading] = useState<string>('');

    let queryWebsites = useQuery({
        queryKey: ['my-websites'],
        queryFn: () => portalApi.assets('website'),
        staleTime: 5 * 60 * 1000,     // 5 分钟
        gcTime: 10 * 60 * 1000,       // 缓存 10 分钟
    });

    let queryWebsiteGroupTree = useQuery({
        queryKey: ['my-websites-group-tree'],
        queryFn: () => portalApi.getWebsitesGroupTree(),
        staleTime: 10 * 60 * 1000,    // 10 分钟(分组变化较少)
    });

    useEffect(() => {
        if (queryWebsites.data) {
            setWebsites(queryWebsites.data);
        }
    }, [queryWebsites.data]);

    // 使用 useMemo 缓存展开键的计算
    const allExpandedKeys = useMemo(() => {
        if (queryWebsiteGroupTree.data) {
            return getAllKeys(queryWebsiteGroupTree.data);
        }
        return [];
    }, [queryWebsiteGroupTree.data]);

    useEffect(() => {
        if (allExpandedKeys.length > 0) {
            setExpandedKeys(allExpandedKeys);
        }
    }, [allExpandedKeys]);

    // 使用 useCallback 优化搜索处理函数
    const handleSearch = useCallback((value: string) => {
        setSearch(value.toLowerCase());
    }, []);

    // 使用 useCallback 优化回调函数
    const openWebsite = useCallback((websiteId: string) => {
        const url = `/browser?websiteId=${websiteId}&t=${new Date().getTime()}`;
        window.open(url, '_blank');
    }, []);

    const allowTempIP = useCallback(async (websiteId: string) => {
        try {
            setAllowLoading(websiteId);
            const data = await portalApi.allowWebsiteIP(websiteId) as any;
            const expiresIn = data?.expiresIn || 0;
            const minutes = Math.max(1, Math.ceil(expiresIn / 60));
            message.success(t('assets.temp_allow_success', { minutes }));
        } catch (error) {
            // error handled globally
        } finally {
            setAllowLoading('');
        }
    }, [t]);

    // 使用 useMemo 缓存过滤结果
    const filteredWebsites = useMemo(() => {
        let filtered = websites || [];

        // 按分组过滤
        if (selectedGroupKey && selectedGroupKey !== '' && queryWebsiteGroupTree.data) {
            const groupIds = getGroupAndChildIds(queryWebsiteGroupTree.data, selectedGroupKey);
            filtered = filtered.filter(item => checkItemInGroups(item.groupId, groupIds));
        }

        // 按搜索关键词过滤
        if (strings.hasText(search)) {
            filtered = filtered.filter(item => {
                if (item.name.toLowerCase().includes(search)) {
                    return true;
                }
                if (item.protocol.toLowerCase().includes(search)) {
                    return true;
                }
                return item.tags?.some(tag => tag.toLowerCase().includes(search));
            });
        }

        return filtered;
    }, [websites, selectedGroupKey, search, queryWebsiteGroupTree.data]);

    // 使用 useMemo 缓存选中的分组节点
    const selectedGroup = useMemo(() => {
        if (selectedGroupKey && queryWebsiteGroupTree.data) {
            return findNode(queryWebsiteGroupTree.data, selectedGroupKey);
        }
        return null;
    }, [selectedGroupKey, queryWebsiteGroupTree.data]);

    return (
        <div className="pb-6">
            <div className={'lg:px-20 px-4'}>
                <div className={'lg:py-6 py-4'}>
                    <div className={'rounded-2xl border border-slate-200/70 dark:border-slate-700/70 p-4 lg:p-5'}>
                        <div className={'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3'}>
                            <div className={'flex flex-col gap-1'}>
                                <div className={'text-xl font-bold text-slate-900 dark:text-slate-100'}>
                                    {t('menus.resource.submenus.website')}
                                </div>
                                {selectedGroup && (
                                    <div className={'flex flex-wrap gap-2'}>
                                        <span className={'inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800/70 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-200'}>
                                            {t('assets.group')} · {selectedGroup.title}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={'pt-3'}>
                            <FacadeSearchBar
                                value={search}
                                onChange={handleSearch}
                                resultCount={filteredWebsites.length}
                                totalCount={websites?.length || 0}
                                placeholder={t('facade.website_placeholder')}
                            />
                        </div>
                    </div>
                </div>

                <div className={'grid lg:grid-cols-[240px_1fr] gap-4'}>
                    {/* 分组树 */}
                    <FacadeGroupTree
                        title={t('assets.group')}
                        treeData={queryWebsiteGroupTree.data}
                        selectedKey={selectedGroupKey}
                        onSelect={setSelectedGroupKey}
                        expandedKeys={expandedKeys}
                        onExpand={setExpandedKeys}
                        loading={queryWebsiteGroupTree.isLoading}
                    />

                    {/* 网站列表 */}
                    <div className={'rounded-lg'}>
                        {queryWebsites.isLoading ? (
                            <div className={'grid 2xl:grid-cols-5 lg:grid-cols-4 lg:gap-6 grid-cols-1 gap-2'}>
                                <FacadeCardSkeleton count={8} />
                            </div>
                        ) : filteredWebsites.length === 0 ? (
                            <Empty />
                        ) : (
                            <div className={'grid 2xl:grid-cols-5 lg:grid-cols-4 lg:gap-6 grid-cols-1 gap-2'}>
                                {filteredWebsites.map(item => (
                                    <FacadeCard
                                        key={item.id}
                                        item={item}
                                        type="website"
                                        onOpen={openWebsite}
                                        onAllowTempIP={allowTempIP}
                                        allowLoading={allowLoading}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default WebsiteFacadePage;
