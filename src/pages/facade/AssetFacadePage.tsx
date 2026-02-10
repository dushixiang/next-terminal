import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useQuery} from "@tanstack/react-query";
import portalApi, {AssetUser} from "@/api/portal-api";
import strings from "@/utils/strings";
import {useTranslation} from "react-i18next";
import {isMobileByMediaQuery} from "@/utils/utils";
import {safeEncode} from "@/utils/codec";
import {checkItemInGroups, findNode, getAllKeys, getGroupAndChildIds} from './utils/facade-utils';
import FacadeSearchBar from './components/FacadeSearchBar';
import FacadeGroupTree from './components/FacadeGroupTree';
import FacadeCard from './components/FacadeCard';
import FacadeCardSkeleton from './components/FacadeCardSkeleton';
import {Empty} from "antd";

const AssetFacadePage = () => {

    let {t} = useTranslation();
    let [assets, setAssets] = useState<AssetUser[]>();
    let [search, setSearch] = useState<string>('');
    let [selectedGroupKey, setSelectedGroupKey] = useState<string>('');
    let [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

    let queryAssets = useQuery({
        queryKey: ['my-assets'],
        queryFn: () => portalApi.assets('asset'),
        staleTime: 5 * 60 * 1000,     // 5 分钟
        gcTime: 10 * 60 * 1000,       // 缓存 10 分钟
    });

    let queryAssetGroupTree = useQuery({
        queryKey: ['my-assets-group-tree'],
        queryFn: () => portalApi.getAssetsGroupTree(),
        staleTime: 10 * 60 * 1000,    // 10 分钟(分组变化较少)
    });

    useEffect(() => {
        if (queryAssets.data) {
            setAssets(queryAssets.data);
        }
    }, [queryAssets.data]);

    // 使用 useMemo 缓存展开键的计算
    const allExpandedKeys = useMemo(() => {
        if (queryAssetGroupTree.data) {
            return getAllKeys(queryAssetGroupTree.data);
        }
        return [];
    }, [queryAssetGroupTree.data]);

    useEffect(() => {
        if (allExpandedKeys.length > 0) {
            setExpandedKeys(allExpandedKeys);
        }
    }, [allExpandedKeys]);

    // 使用 useCallback 优化搜索处理函数
    const handleSearch = useCallback((value: string) => {
        setSearch(value.toLowerCase());
    }, []);

    // 使用 useMemo 缓存过滤结果
    const filteredAssets = useMemo(() => {
        let filtered = assets || [];

        // 按分组过滤
        if (selectedGroupKey && selectedGroupKey !== '' && queryAssetGroupTree.data) {
            const groupIds = getGroupAndChildIds(queryAssetGroupTree.data, selectedGroupKey);
            filtered = filtered.filter(item => checkItemInGroups(item.groupId, groupIds));
        }

        // 按搜索关键词过滤
        if (strings.hasText(search)) {
            filtered = filtered.filter(item => {
                if (item.name.toLowerCase().includes(search)) {
                    return true;
                }
                if (item.alias && item.alias.toLowerCase().includes(search)) {
                    return true;
                }
                if (item.address.toLowerCase().includes(search)) {
                    return true;
                }
                if (item.protocol.toLowerCase().includes(search)) {
                    return true;
                }
                return item.tags?.some(tag => tag.toLowerCase().includes(search));
            });
        }

        return filtered;
    }, [assets, selectedGroupKey, search, queryAssetGroupTree.data]);

    // 使用 useMemo 缓存选中的分组节点
    const selectedGroup = useMemo(() => {
        if (selectedGroupKey && queryAssetGroupTree.data) {
            return findNode(queryAssetGroupTree.data, selectedGroupKey);
        }
        return null;
    }, [selectedGroupKey, queryAssetGroupTree.data]);

    // 渲染访问链接的函数
    const renderAccessLink = useCallback((item: AssetUser) => {
        const id = item.id;
        const protocol = item.protocol;

        // 构建访问链接
        let href = '';
        if (protocol === 'http') {
            href = `/browser?websiteId=${id}&t=${new Date().getTime()}`;
        } else if (isMobileByMediaQuery() && protocol === 'ssh') {
            href = `/mobile-terminal?assetId=${id}&t=${new Date().getTime()}`;
        } else {
            const msg = {
                id: id,
                name: item.name,
                protocol: item.protocol,
                status: item.status,
                wolEnabled: item.attrs?.['wol-enabled'] || false,
            };
            href = `/access?asset=${safeEncode(msg)}`;
        }

        return (
            <a
                key={item.id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group block cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 rounded-xl"
            >
                <FacadeCard
                    item={item}
                    type="asset"
                />
            </a>
        );
    }, []);

    return (
        <div className="pb-6">
            <div className={'lg:px-20 px-4'}>
                <div className={'lg:py-6 py-4'}>
                    <div className={'rounded-2xl border border-slate-200/70 dark:border-slate-700/70 p-4 lg:p-5'}>
                        <div className={'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3'}>
                            <div className={'flex flex-col gap-1'}>
                                <div className={'text-xl font-bold text-slate-900 dark:text-slate-100'}>
                                    {t('menus.resource.submenus.asset')}
                                </div>
                                {selectedGroup && (
                                    <div className={'flex flex-wrap gap-2'}>
                                        <span
                                            className={'inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800/70 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-200'}>
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
                                resultCount={filteredAssets.length}
                                totalCount={assets?.length || 0}
                                placeholder={t('facade.asset_placeholder')}
                            />
                        </div>
                    </div>
                </div>

                <div className={'grid lg:grid-cols-[240px_1fr] gap-4'}>
                    {/* 分组树 */}
                    <FacadeGroupTree
                        title={t('assets.group')}
                        treeData={queryAssetGroupTree.data}
                        selectedKey={selectedGroupKey}
                        onSelect={setSelectedGroupKey}
                        expandedKeys={expandedKeys}
                        onExpand={setExpandedKeys}
                        loading={queryAssetGroupTree.isLoading}
                    />

                    {/* 资产列表 */}
                    <div className={'rounded-lg'}>
                        {queryAssets.isLoading ? (
                            <div className={'grid 2xl:grid-cols-5 lg:grid-cols-4 lg:gap-6 grid-cols-1 gap-2'}>
                                <FacadeCardSkeleton count={8}/>
                            </div>
                        ) : filteredAssets.length === 0 ? (
                            <Empty/>
                        ) : (
                            <div className={'grid 2xl:grid-cols-5 lg:grid-cols-4 lg:gap-6 grid-cols-1 gap-2'}>
                                {filteredAssets.map(item => renderAccessLink(item))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AssetFacadePage;
