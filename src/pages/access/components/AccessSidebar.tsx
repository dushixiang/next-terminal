import React, {Key, useEffect, useState} from 'react';
import {Input} from 'antd';
import {ResizablePanel} from '@/components/ui/resizable';
import {ScrollArea, ScrollBar} from '@/components/ui/scroll-area';
import {cn} from '@/lib/utils';
import {ImperativePanelHandle} from 'react-resizable-panels';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';
import portalApi, {TreeDataNodeWithExtra} from '@/api/portal-api';
import AssetTree from '@/pages/access/components/AssetTree';
import {LocalStorage, STORAGE_KEYS} from '@/utils/storage';
import {
    ACCESS_SIDEBAR_COLLAPSED_MIN_WIDTH,
    ACCESS_SIDEBAR_COLLAPSED_SIZE,
    ACCESS_SIDEBAR_DEFAULT_SIZE,
    ACCESS_SIDEBAR_EXPANDED_MIN_WIDTH,
    ACCESS_SIDEBAR_MAX_SIZE,
} from '@/pages/access/constants';

interface AccessSidebarProps {
    isCollapsed: boolean;
    leftPanelSize: number;
    onResize: (size: number) => void;
    leftRef: React.RefObject<ImperativePanelHandle>;
    onNodeDoubleClick: (node: TreeDataNodeWithExtra) => void;
}

/**
 * AccessSidebar 组件
 * 左侧资产面板，包含搜索框和资产树
 * 内部管理树数据查询和状态
 */
const AccessSidebar = React.memo(({
                                      isCollapsed,
                                      leftPanelSize,
                                      onResize,
                                      leftRef,
                                      onNodeDoubleClick,
                                  }: AccessSidebarProps) => {
    const {t} = useTranslation();

    // 树状态管理
    const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
    const [hasLoadedExpandedKeys, setHasLoadedExpandedKeys] = useState(false);

    const [searchInput, setSearchInput] = useState('');
    const [searchValue, setSearchValue] = useState('');

    // 查询树数据
    const treeQuery = useQuery({
        queryKey: ['assets/tree/portal', searchValue],
        queryFn: () => portalApi.getAssetsTree('', searchValue),
        refetchOnWindowFocus: true,
    });

    useEffect(() => {
        if (hasLoadedExpandedKeys || !treeQuery.data) {
            return;
        }
        const saved = LocalStorage.get(STORAGE_KEYS.TREE_EXPANDED_KEYS, []);
        if (Array.isArray(saved)) {
            setExpandedKeys(saved);
        }
        setHasLoadedExpandedKeys(true);
    }, [hasLoadedExpandedKeys, treeQuery.data]);

    // 搜索框变化处理
    const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {value} = e.target;
        setSearchInput(value);
        if (value === '') {
            setSearchValue('');
        }
    };

    // 树展开状态变化处理
    const onExpand = (newExpandedKeys: Key[]) => {
        setExpandedKeys(newExpandedKeys);
        LocalStorage.set(STORAGE_KEYS.TREE_EXPANDED_KEYS, newExpandedKeys);
    };

    return (
        <ResizablePanel
            defaultSize={leftPanelSize}
            minSize={ACCESS_SIDEBAR_DEFAULT_SIZE}
            maxSize={ACCESS_SIDEBAR_MAX_SIZE}
            collapsible={true}
            collapsedSize={ACCESS_SIDEBAR_COLLAPSED_SIZE}
            onResize={onResize}
            className={cn(
                "flex h-full flex-col overflow-hidden bg-[#141414] transition-all duration-300 ease-in-out",
            )}
            style={{
                minWidth: isCollapsed ? ACCESS_SIDEBAR_COLLAPSED_MIN_WIDTH : ACCESS_SIDEBAR_EXPANDED_MIN_WIDTH,
            }}
            ref={leftRef}
        >
            {!isCollapsed && (
                <div className={'p-2'}>
                    <Input.Search
                        placeholder={t('access.search')}
                        value={searchInput}
                        onChange={handleSearchInputChange}
                        onSearch={(value) => {
                            setSearchValue(value);
                        }}
                        allowClear
                    />
                </div>
            )}

            <ScrollArea className={'flex-1 py-2'}>
                {!isCollapsed && (
                    <AssetTree
                        treeData={treeQuery.data || []}
                        expandedKeys={expandedKeys}
                        onExpand={onExpand}
                        onNodeDoubleClick={onNodeDoubleClick}
                    />
                )}
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </ResizablePanel>
    );
});

AccessSidebar.displayName = 'AccessSidebar';

export default AccessSidebar;
