import React, {useEffect, useState} from 'react';
import {useQuery} from "@tanstack/react-query";
import portalApi, {AssetUser, TreeDataNodeWithExtra} from "@/api/portal-api";
import './FacadePage.css';
import strings from "@/utils/strings";
import clsx from "clsx";
import {Search} from "lucide-react";
import {Badge, Popover, Tooltip, Tree, Typography} from "antd";
import {useTranslation} from "react-i18next";
import {getImgColor, getProtocolColor} from "@/helper/asset-helper";
import {isMobileByMediaQuery} from "@/utils/utils";
import {cn} from "@/lib/utils";

const WebsiteFacadePage = () => {

    let {t} = useTranslation();
    let [websites, setWebsites] = useState<AssetUser[]>();
    let [search, setSearch] = useState<string>('');
    let [selectedGroupKey, setSelectedGroupKey] = useState<string>('');
    let [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

    let queryWebsites = useQuery({
        queryKey: ['my-websites'],
        queryFn: () => portalApi.assets('website')
    });

    let queryWebsiteGroupTree = useQuery({
        queryKey: ['my-websites-group-tree'],
        queryFn: () => portalApi.getWebsitesGroupTree(),
    });

    useEffect(() => {
        if (queryWebsites.data) {
            setWebsites(queryWebsites.data);
        }
    }, [queryWebsites.data]);

    useEffect(() => {
        if (queryWebsiteGroupTree.data) {
            const keys = getAllKeys(queryWebsiteGroupTree.data);
            setExpandedKeys(keys);
        }
    }, [queryWebsiteGroupTree.data]);

    const getAllKeys = (data: TreeDataNodeWithExtra[]): React.Key[] => {
        let keys: React.Key[] = [];
        data.forEach((item) => {
            if (!item.isLeaf) {
                keys.push(item.key);
            }
            if (item.children) {
                keys = keys.concat(getAllKeys(item.children));
            }
        });
        return keys;
    };

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

    const getFilteredWebsites = () => {
        let filtered = websites || [];
        
        // 按分组过滤
        if (selectedGroupKey && selectedGroupKey !== '') {
            filtered = filtered.filter(item => {
                return isInGroup(item.id, selectedGroupKey);
            });
        }
        
        // 按搜索关键词过滤
        if (strings.hasText(search)) {
            filtered = filtered.filter(item => {
                if (item.name.toLowerCase().includes(search)) {
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
    };

    const isInGroup = (websiteId: string, groupKey: string): boolean => {
        const website = websites?.find(w => w.id === websiteId);
        if (!website) return false;
        
        const treeData = queryWebsiteGroupTree.data;
        if (!treeData) return false;
        
        const groupIds = getGroupAndChildIds(treeData, groupKey);
        return checkWebsiteInGroups(websiteId, groupIds);
    };

    const getGroupAndChildIds = (data: TreeDataNodeWithExtra[], groupKey: string): string[] => {
        const ids: string[] = [groupKey];
        
        const collectChildIds = (nodes: TreeDataNodeWithExtra[], parentKey: string) => {
            for (const node of nodes) {
                if (node.key === parentKey) {
                    if (node.children) {
                        node.children.forEach(child => {
                            if (!child.isLeaf) {
                                ids.push(child.key);
                                collectChildIds(node.children!, child.key);
                            }
                        });
                    }
                    return;
                }
                if (node.children) {
                    collectChildIds(node.children, parentKey);
                }
            }
        };
        
        collectChildIds(data, groupKey);
        return ids;
    };

    const checkWebsiteInGroups = (websiteId: string, groupIds: string[]): boolean => {
        const website = websites?.find(w => w.id === websiteId);
        if (!website) return false;
        
        return groupIds.includes(website.groupId) || website.groupId === '';
    };

    const findNode = (data: TreeDataNodeWithExtra[], key: string): TreeDataNodeWithExtra | null => {
        for (const item of data) {
            if (item.key === key) {
                return item;
            }
            if (item.children) {
                const found = findNode(item.children, key);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    };

    return (
        <div>
            <div className={'lg:px-20 px-4'}>
                <div className={'lg:py-6 py-4 flex'}>
                    <div className={'flex-grow text-xl font-bold'}>
                        {t('menus.resource.submenus.website')}
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

                <div className={'grid lg:grid-cols-[240px_1fr] gap-4'}>
                    {/* 分组树 */}
                    <div className={'hidden lg:block rounded-lg bg-white dark:bg-[#141414] p-4'}>
                        <div className={'font-medium text-[15px] mb-2'}>
                            {t('websites.group')}
                        </div>
                        <Tree
                            treeData={queryWebsiteGroupTree.data}
                            expandedKeys={expandedKeys}
                            onExpand={setExpandedKeys}
                            selectedKeys={selectedGroupKey ? [selectedGroupKey] : []}
                            onSelect={(keys) => {
                                if (keys.length > 0) {
                                    setSelectedGroupKey(keys[0] as string);
                                } else {
                                    setSelectedGroupKey('');
                                }
                            }}
                            blockNode
                        />
                    </div>

                    {/* 网站列表 */}
                    <div className={'rounded-lg'}>
                        <div className={'grid 2xl:grid-cols-5 lg:grid-cols-4 lg:gap-6 grid-cols-1 gap-2'}>
                            {getFilteredWebsites().map(item => {
                            const id = item.id;

                            let url1 = `/browser?websiteId=${id}&t=${new Date().getTime()}`
                            let props = {
                                href: url1,
                                target: '_blank',
                            }

                            return <a key={item.id}
                                      className={'cursor-pointer block'}
                                      {...props}
                            >
                                <div className={clsx(
                                    'relative'
                                    , item.status === 'inactive' && 'filter grayscale'
                                )}>
                                    <div
                                        className={clsx('bg-white dark:bg-[#1f1f1f] flex gap-3 px-4 py-3 rounded-md relative min-h-[84px]')}>
                                        <div className={'flex-shrink-0'}>
                                            {renderImg(item)}
                                        </div>
                                        <div className={'flex-1 flex flex-col gap-1 text-xs min-w-0'}>
                                            <div className={'flex flex-col gap-0.5'}>
                                                <Tooltip title={item.name}>
                                                    <div className={'font-medium text-sm truncate pr-12'}>{item.name}</div>
                                                </Tooltip>
                                                <Tooltip title={item.address}>
                                                    <div className={'text-gray-400 truncate text-xs'}>
                                                        {item.address}
                                                    </div>
                                                </Tooltip>
                                            </div>
                                            {item.description && (
                                                <Popover content={<div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        return false;
                                                    }}>
                                                    <Typography.Paragraph copyable
                                                                          style={{marginBottom: 0}}>{item.description}</Typography.Paragraph>
                                                </div>}>
                                                    <div className={'text-gray-400 line-clamp-1 text-xs'}>{item.description}</div>
                                                </Popover>
                                            )}
                                            {item.tags && item.tags.length > 0 && (
                                                <div className={'flex flex-wrap gap-1 mt-0.5'}>
                                                    {item.tags.map(tag => {
                                                        return <span key={tag}
                                                                     className={'inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-700 dark:text-gray-300'}>
                                                              {tag}
                                                            </span>
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <span
                                        className={clsx('absolute top-2 right-2 whitespace-nowrap rounded-md px-1.5 py-0.5 text-white font-bold', getProtocolColor(item.protocol))}
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
        </div>
    );
};

export default WebsiteFacadePage;
