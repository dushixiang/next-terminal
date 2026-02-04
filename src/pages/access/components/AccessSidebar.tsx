import React, {Key, useEffect, useState} from 'react';
import {Input} from 'antd';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {ResizablePanel} from '@/components/ui/resizable';
import {ScrollArea} from '@/components/ui/scroll-area';
import {cn} from '@/lib/utils';
import {ImperativePanelHandle} from 'react-resizable-panels';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';
import portalApi, {TreeDataNodeWithExtra} from '@/api/portal-api';
import AssetTree from '@/pages/access/components/AssetTree';
import {LocalStorage, STORAGE_KEYS} from '@/utils/storage';

interface AccessSidebarProps {
    isCollapsed: boolean;
    leftPanelSize: number;
    height: number;
    onResize: (size: number) => void;
    leftRef: React.RefObject<ImperativePanelHandle>;
    onNodeDoubleClick: (node: TreeDataNodeWithExtra) => void;
}

/**
 * AccessSidebar 组件
 * 左侧资产面板，包含搜索框、折叠按钮和资产树
 * 内部管理树数据查询和状态
 */
const AccessSidebar = React.memo(({
                                      isCollapsed,
                                      leftPanelSize,
                                      height,
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
            minSize={15}
            maxSize={20}
            style={{
                maxHeight: height - 40,
            }}
            collapsible={true}
            collapsedSize={2}
            onResize={onResize}
            className={cn(
                "bg-[#141414] transition-all duration-300 ease-in-out",
                isCollapsed && "min-w-[48px]",
                !isCollapsed && "min-w-[240px]",
            )}
            ref={leftRef}
        >
            <ScrollArea
                className={'py-2'}
                style={{
                    height: height - 40,
                }}
            >
                <div className={'px-2 pb-2 flex items-center gap-2'}>
                    {!isCollapsed && (
                        <Input.Search
                            placeholder={t('access.search')}
                            value={searchInput}
                            onChange={handleSearchInputChange}
                            onSearch={(value) => {
                                setSearchValue(value);
                            }}
                            allowClear
                        />
                    )}

                    <div
                        className={'flex items-center justify-center h-8 w-8 rounded border bg-border cursor-pointer'}
                        onClick={() => {
                            if (leftRef.current?.isCollapsed()) {
                                leftRef.current?.expand();
                            } else {
                                leftRef.current?.collapse();
                            }
                        }}
                    >
                        {isCollapsed ? (
                            <ChevronRight className={'h-4 w-4'}/>
                        ) : (
                            <ChevronLeft className="h-4 w-4"/>
                        )}
                    </div>
                </div>

                {!isCollapsed && (
                    <AssetTree
                        treeData={treeQuery.data || []}
                        expandedKeys={expandedKeys}
                        onExpand={onExpand}
                        onNodeDoubleClick={onNodeDoubleClick}
                    />
                )}
            </ScrollArea>
        </ResizablePanel>
    );
});

AccessSidebar.displayName = 'AccessSidebar';

export default AccessSidebar;
