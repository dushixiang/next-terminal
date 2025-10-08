import React, {Key, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {App, ConfigProvider, Input, Tabs, theme, Tooltip, Tree, TreeDataNode} from "antd";
import './AccessPage.css'
import brandingApi from "@/src/api/branding-api";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {ThemeProvider} from "@/components/theme-provider";
import AccessTerminal from "@/src/pages/access/AccessTerminal";
import {ChevronLeft, ChevronRight, Palette, Settings, TerminalIcon} from "lucide-react";
import type {DragEndEvent} from '@dnd-kit/core';
import {closestCenter, DndContext, PointerSensor, useSensor} from '@dnd-kit/core';
import {arrayMove, horizontalListSortingStrategy, SortableContext, useSortable,} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import AccessTheme from "@/src/pages/access/AccessTheme";
import AccessSetting from "@/src/pages/access/AccessSetting";
import {useQuery} from "@tanstack/react-query";
import portalApi, {TreeDataNodeWithExtra} from "@/src/api/portal-api";
import SimpleBar from "simplebar-react";
import {useWindowSize} from "react-use";
import {useAccessTab} from "@/src/hook/use-access-tab";
import AccessGuacamole from "@/src/pages/access/AccessGuacamole";
import {StyleProvider} from '@ant-design/cssinjs';
import {beforeUnload, generateRandomId, handleKeyDown} from "@/src/utils/utils";
import {useAccessContentSize} from "@/src/hook/use-access-size";
import {AccessTabSyncMessage} from "@/src/helper/access-tab-channel";
import {cn} from "@/lib/utils";
import {useSearchParams} from "react-router-dom";
import {ImperativePanelHandle} from "react-resizable-panels";
import AccessSshChooser from "@/src/pages/access/AccessSshChooser";
import AccessTerminalBulk from "@/src/pages/access/AccessTerminalBulk";
import MultiFactorAuthentication from "@/src/pages/account/MultiFactorAuthentication";
import clsx from "clsx";
import {getImgColor} from "@/src/helper/asset-helper";
import {useTranslation} from "react-i18next";
import {useLicense} from "@/src/hook/use-license";
import licenseApi from "@/src/api/license-api";
import {safeDecode} from "@/src/utils/codec";
import {useAccessSetting} from "@/src/hook/use-access-setting";
import accessSettingApi from "@/src/api/access-setting-api";
import {setThemeColor} from "@/src/utils/theme";
import TabContextMenu from "@/src/components/TabContextMenu";
import {LocalStorage, STORAGE_KEYS} from "@/src/utils/storage";


interface DraggableTabPaneProps extends React.HTMLAttributes<HTMLDivElement> {
    'data-node-key': string;
}

const DraggableTabNode = ({className, ...props}: DraggableTabPaneProps) => {
    const {attributes, listeners, setNodeRef, transform, transition} = useSortable({
        id: props['data-node-key'],
    });

    const style: React.CSSProperties = {
        ...props.style,
        transform: CSS.Translate.toString(transform),
        transition,
        cursor: 'move',
    };

    return React.cloneElement(props.children as React.ReactElement, {
        ref: setNodeRef,
        style,
        ...attributes,
        ...listeners,
    });
};

const AccessPage = () => {

    let {t} = useTranslation();
    
    // 从本地存储恢复面板状态
    const [isCollapsed, setIsCollapsed] = React.useState(() => {
        return LocalStorage.get(STORAGE_KEYS.COLLAPSED_STATE, false);
    });
    
    // 从本地存储恢复面板大小
    const [leftPanelSize, setLeftPanelSize] = useState(() => {
        const savedSizes = LocalStorage.get(STORAGE_KEYS.PANEL_SIZES, { left: 15, right: 85 });
        return savedSizes.left;
    });
    
    const [items, setItems] = useState([]);
    const [activeKey, setActiveKey] = useAccessTab();
    let [searchParams, setSearchParams] = useSearchParams();
    let defaultAsset = searchParams.get('asset');

    let [sshChooserOpen, setSSHChooserOpen] = useState(false);
    let [mfaOpen, setMfaOpen] = useState(false);
    let [chooseAssetIds, setChooseAssetIds] = useState<string[]>([]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        window.addEventListener("beforeunload", beforeUnload, true);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("beforeunload", beforeUnload, true);
            document.removeEventListener("keydown", handleKeyDown);
        }
    }, []);

    useEffect(() => {
        if (defaultAsset) {
            let msg = safeDecode(defaultAsset) as AccessTabSyncMessage;
            if (msg) {
                openAssetTab(msg);
            }
        }
        setSearchParams({}, {replace: true});

        setThemeColor('#313131');
    }, []);

    let brandingQuery = useQuery({
        queryKey: ['branding'],
        queryFn: brandingApi.getBranding,
    });

    const sensor = useSensor(PointerSensor, {activationConstraint: {distance: 10}});
    let {height} = useWindowSize();

    const onDragEnd = useCallback(({active, over}: DragEndEvent) => {
        if (active.id !== over?.id) {
            setItems((prev) => {
                const activeIndex = prev.findIndex((i) => i.key === active.id);
                const overIndex = prev.findIndex((i) => i.key === over?.id);
                return arrayMove(prev, activeIndex, overIndex);
            });
        }
    }, []);

    // 从本地存储恢复树展开状态
    let [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
    
    const [searchValue, setSearchValue] = useState('');

    let leftRef = useRef<ImperativePanelHandle>();

    let [_, setContentSize] = useAccessContentSize();

    let treeQuery = useQuery({
        queryKey: ['assets/tree/portal'],
        queryFn: () => {
            return portalApi.getAssetsTree('', searchValue)
        },
    });

    useEffect(() => {
        if (treeQuery.data?.length) {
            const saved = LocalStorage.get(STORAGE_KEYS.TREE_EXPANDED_KEYS, []);
            if (Array.isArray(saved)) {
                setExpandedKeys(saved);
            }
        }
    }, [treeQuery.data]);

    useEffect(() => {
        // 当树数据更新时，确保展开状态得到保持
        if (treeQuery.data && expandedKeys.length > 0) {
            // 验证保存的展开键是否仍然存在于新的树数据中
            const validateExpandedKeys = (keys: React.Key[], treeData: TreeDataNode[]): React.Key[] => {
                const allKeys = new Set<React.Key>();
                
                const collectKeys = (nodes: TreeDataNode[]) => {
                    nodes.forEach(node => {
                        allKeys.add(node.key);
                        if (node.children) {
                            collectKeys(node.children);
                        }
                    });
                };
                
                collectKeys(treeData);
                return keys.filter(key => allKeys.has(key));
            };
            
            const validKeys = validateExpandedKeys(expandedKeys, treeQuery.data);
            if (validKeys.length !== expandedKeys.length) {
                setExpandedKeys(validKeys);
                LocalStorage.set(STORAGE_KEYS.TREE_EXPANDED_KEYS, validKeys);
            }
        }
    }, [treeQuery.data, expandedKeys]);

    useEffect(() => {
        treeQuery.refetch();
    }, [searchValue]);

    const addTab = useCallback((key: string, label: string, children: React.ReactNode) => {
        let find = items.filter((item) => item.key === key);
        if (find && find.length > 0) {
            setActiveKey(key);
            return;
        }
        const newPanes = [...items];
        newPanes.push({label: label, children: children, key: key});
        setItems(newPanes);
        setActiveKey(key);
    }, [items]);

    const removeTab = useCallback((targetKey: string) => {
        let newActiveKey = activeKey;
        let lastIndex = -1;
        items.forEach((item, i) => {
            if (item.key === targetKey) {
                lastIndex = i - 1;
            }
        });
        const newPanes = items.filter((item) => item.key !== targetKey);
        if (newPanes.length && newActiveKey === targetKey) {
            if (lastIndex >= 0) {
                newActiveKey = newPanes[lastIndex].key;
            } else {
                newActiveKey = newPanes[0].key;
            }
        }
        setItems(newPanes);
        setActiveKey(newActiveKey);
    }, [items, activeKey]);

    const openAssetTab = useCallback((msg: AccessTabSyncMessage) => {
        const randomId = generateRandomId();
        const key = randomId + '_' + msg.id;
        switch (msg.protocol) {
            case "ssh":
            case "telnet":
                addTab(key, msg.name, <AccessTerminal assetId={msg.id}/>);
                break;
            case "rdp":
                addTab(key, msg.name, <AccessGuacamole assetId={msg.id}/>);
                break;
            default:
                addTab(key, msg.name, <AccessGuacamole assetId={msg.id}/>);
                // alert('not support')
                break;
        }
    }, [addTab]);


    useEffect(() => {
        const channel = new BroadcastChannel('access-tab-sync');
        channel.onmessage = (event) => {
            setTimeout(() => {
                // console.log(`当前 items`, items.length)
                // console.table(items);
                openAssetTab(event.data);
            }, 200);
        };
        return () => {
            channel.close();
        }
    }, [items]);

    const getParentKey = useCallback((key: React.Key, tree: TreeDataNode[]): React.Key => {
        let parentKey: React.Key;
        for (let i = 0; i < tree.length; i++) {
            const node = tree[i];
            if (node.children) {
                if (node.children.some((item) => item.key === key)) {
                    parentKey = node.key;
                } else if (getParentKey(key, node.children)) {
                    parentKey = getParentKey(key, node.children);
                }
            }
        }
        return parentKey!;
    }, []);

    const handleSearchTree = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const {value} = e.target;
        setSearchValue(value);
    }, []);

    const onExpand = useCallback((newExpandedKeys: React.Key[]) => {
        setExpandedKeys(newExpandedKeys);
        // 保存到本地存储
        LocalStorage.set(STORAGE_KEYS.TREE_EXPANDED_KEYS, newExpandedKeys);
    }, []);

    // 标签页操作函数
    const handleCloseLeft = useCallback((targetKey: string) => {
        const targetIndex = items.findIndex(item => item.key === targetKey);
        if (targetIndex <= 0) return;
        
        const leftTabs = items.slice(0, targetIndex);
        const remainingTabs = items.slice(targetIndex);
        
        setItems(remainingTabs);
        
        // 如果当前激活的标签页被关闭，切换到目标标签页
        if (leftTabs.some(tab => tab.key === activeKey)) {
            setActiveKey(targetKey);
        }
    }, [items, activeKey]);

    const handleCloseRight = useCallback((targetKey: string) => {
        const targetIndex = items.findIndex(item => item.key === targetKey);
        if (targetIndex < 0 || targetIndex >= items.length - 1) return;
        
        const leftTabs = items.slice(0, targetIndex + 1);
        
        setItems(leftTabs);
        
        // 如果当前激活的标签页被关闭，切换到目标标签页
        if (!leftTabs.some(tab => tab.key === activeKey)) {
            setActiveKey(targetKey);
        }
    }, [items, activeKey]);

    const handleCloseAll = useCallback(() => {
        setItems([]);
        setActiveKey('');
    }, []);

    const handleCloseOthers = useCallback((targetKey: string) => {
        const targetTab = items.find(item => item.key === targetKey);
        if (!targetTab) return;
        
        setItems([targetTab]);
        setActiveKey(targetKey);
    }, [items]);

    const handleReconnect = useCallback((targetKey: string) => {
        // 刷新标签页 - 重新渲染组件
        const targetTab = items.find(item => item.key === targetKey);
        if (!targetTab) return;
        
        // 通过更新 key 来强制重新渲染
        const newKey = targetKey + '_refresh_' + Date.now();
        const newTab = { ...targetTab, key: newKey };
        
        setItems(prev => prev.map(item => 
            item.key === targetKey ? newTab : item
        ));
        setActiveKey(newKey);
    }, [items]);

    // 面板大小变化处理
    const handlePanelResize = useCallback((size: number) => {
        setLeftPanelSize(size);
        
        // 保存到本地存储
        const panelSizes = { left: size, right: 100 - size };
        LocalStorage.set(STORAGE_KEYS.PANEL_SIZES, panelSizes);
        
        // 更新折叠状态
        const collapsed = size === 2;
        if (collapsed !== isCollapsed) {
            setIsCollapsed(collapsed);
            LocalStorage.set(STORAGE_KEYS.COLLAPSED_STATE, collapsed);
        }
        
        setContentSize(100 - size);
    }, [isCollapsed, setContentSize]);

    const renderLogo = useCallback((node: TreeDataNodeWithExtra) => {
        if (!node.isLeaf) {
            return undefined;
        }
        if (node.extra?.logo) {
            return <img className={'h-4 w-4'} src={node.extra?.logo} alt={'logo'}/>
        }
        return <div
            className={clsx(`w-4 h-4 rounded flex items-center justify-center text-white`, getImgColor(node.extra?.protocol))}
            style={{
                fontSize: 9,
            }}
        >
            {node.title[0]}
        </div>
    }, []);

    return (
        <ConfigProvider
            theme={{
                components: {
                    Tabs: {
                        titleFontSizeSM: 13,
                    },
                },
                algorithm: theme.darkAlgorithm
            }}
        >
            <App>
                <StyleProvider hashPriority="high">
                    <div className={'h-screen w-screen overflow-hidden'}>
                        <div className={'text-white h-10 bg-[#313131] flex items-center gap-6'}>
                            <div className={'flex items-center px-2 gap-2'}>
                                <img src={brandingApi.getLogo()} alt='logo' className={'h-6 w-6 rounded'}/>
                                <div className={'font-bold'}>
                                    {brandingQuery.data?.name}
                                </div>
                            </div>

                            <div className={'flex items-center gap-6 text-white'}>

                                <Tooltip title={t('access.settings.theme')} placement={'right'}>
                                    <Palette className={'h-4 w-4 cursor-pointer'} onClick={() => {
                                        addTab('theme', t('access.settings.theme'), <AccessTheme/>);
                                    }}/>
                                </Tooltip>

                                <Tooltip title={t('access.settings.system')} placement={'right'}>
                                    <Settings className={'h-4 w-4 cursor-pointer'} onClick={() => {
                                        addTab('setting', t('access.settings.system'), <AccessSetting/>);
                                    }}/>
                                </Tooltip>

                                <Tooltip title={t('access.batch.exec')} placement={'right'}>
                                    <TerminalIcon className={'h-4 w-4 cursor-pointer'} onClick={() => {
                                        setSSHChooserOpen(true);
                                    }}/>
                                </Tooltip>
                            </div>
                        </div>
                        <ThemeProvider defaultTheme="dark" storageKey="nt-ui-theme">
                            <ResizablePanelGroup direction="horizontal">
                                <ResizablePanel
                                    defaultSize={leftPanelSize}
                                    minSize={15}
                                    maxSize={20}
                                    style={{
                                        maxHeight: height - 40,
                                    }}
                                    collapsible={true}
                                    collapsedSize={2}
                                    onResize={handlePanelResize}
                                    className={cn(
                                        "bg-[#141414] transition-all duration-300 ease-in-out",
                                        isCollapsed && "min-w-[48px]",
                                        !isCollapsed && "min-w-[240px]",
                                    )}
                                    ref={leftRef}
                                >
                                    <SimpleBar className={'py-2'}
                                               style={{
                                                   maxHeight: height - 40,
                                               }}
                                    >
                                        <div className={'px-2 pb-2 flex items-center gap-2'}>
                                            {!isCollapsed &&
                                                <Input.Search placeholder={t('access.search')}
                                                              onChange={handleSearchTree}/>}
                                            <div>
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
                                                    {isCollapsed ?
                                                        <ChevronRight className={'h-4 w-4'}/> :
                                                        <ChevronLeft className="h-4 w-4"/>
                                                    }
                                                </div>
                                            </div>
                                        </div>

                                        {!isCollapsed &&
                                            <Tree
                                                titleRender={(node) => {
                                                    const strTitle = node.title as string;
                                                    const index = searchValue ? strTitle.indexOf(searchValue) : -1;
                                                    const beforeStr = strTitle.substring(0, index);
                                                    const afterStr = strTitle.slice(index + searchValue.length);
                                                    const displayTitle = index > -1 ? (
                                                        <span>
                                                            {beforeStr}
                                                            <span className="text-yellow-500">{searchValue}</span>
                                                            {afterStr}
                                                        </span>
                                                    ) : (
                                                        <span>{strTitle}</span>
                                                    );
                                                    
                                                    return <Tooltip title={node.extra?.network}>
                                                        <span className={cn(
                                                            'flex items-center gap-1',
                                                            node.extra?.status === 'inactive' && 'filter grayscale'
                                                        )}
                                                              onDoubleClick={() => {
                                                                  if (!node.isLeaf) {
                                                                      return
                                                                  }
                                                                  openAssetTab({
                                                                      id: node.key,
                                                                      name: node.title,
                                                                      protocol: node.extra?.protocol,
                                                                  })
                                                              }}
                                                        >
                                                            {renderLogo(node)}
                                                            <div className={cn(
                                                                node.extra?.status === 'inactive' && 'text-gray-500'
                                                            )}>
                                                                {displayTitle}
                                                            </div>
                                                    </span>
                                                    </Tooltip>
                                                }}
                                                treeData={treeQuery.data || []}
                                                onExpand={onExpand}
                                                expandedKeys={expandedKeys}
                                            />
                                        }
                                    </SimpleBar>
                                </ResizablePanel>
                                <ResizableHandle withHandle/>
                                <ResizablePanel defaultSize={100 - leftPanelSize}
                                                className={'bg-[#1E1E1E] access-container'}
                                                onResize={(size) => {
                                                    // console.log('resize content', size)
                                                    setContentSize(size);
                                                }}
                                >
                                    <Tabs
                                        items={items.map((item) => ({
                                            key: item.key,
                                            label: (
                                                <TabContextMenu
                                                    tabKey={item.key}
                                                    currentActiveKey={activeKey}
                                                    allTabs={items}
                                                    onCloseLeft={handleCloseLeft}
                                                    onCloseRight={handleCloseRight}
                                                    onCloseAll={handleCloseAll}
                                                    onCloseOthers={handleCloseOthers}
                                                    onReconnect={handleReconnect}
                                                >
                                                    {item.label}
                                                </TabContextMenu>
                                            ),
                                            children: item.children,
                                        }))}
                                        hideAdd
                                        size={'small'}
                                        type={'editable-card'}
                                        renderTabBar={(tabBarProps, DefaultTabBar) => (
                                            <DndContext sensors={[sensor]} onDragEnd={onDragEnd}
                                                        collisionDetection={closestCenter}>
                                                <SortableContext items={items.map((i) => i.key)}
                                                                 strategy={horizontalListSortingStrategy}>
                                                    <DefaultTabBar {...tabBarProps}>
                                                        {(node) => (
                                                            <DraggableTabNode {...node.props} key={node.key}>
                                                                {node}
                                                            </DraggableTabNode>
                                                        )}
                                                    </DefaultTabBar>
                                                </SortableContext>
                                            </DndContext>
                                        )}
                                        tabBarStyle={{}}
                                        activeKey={activeKey}
                                        onChange={setActiveKey}
                                        onEdit={useCallback((targetKey, action) => {
                                            if (action === 'add') {
                                                // add();
                                            } else {
                                                removeTab(targetKey as string);
                                            }
                                        }, [removeTab])}
                                    />
                                </ResizablePanel>
                            </ResizablePanelGroup>

                            <AccessSshChooser
                                open={sshChooserOpen}
                                handleCancel={() => {
                                    setSSHChooserOpen(false);
                                }}
                                handleOk={async (values: string[]) => {
                                    let required = await portalApi.getAccessRequireMFA();
                                    if (required) {
                                        setMfaOpen(true);
                                        setChooseAssetIds(values);
                                    } else {
                                        setSSHChooserOpen(false);
                                        const key = generateRandomId();
                                        addTab(key, t('access.batch.exec'), <AccessTerminalBulk assetIds={values}/>)
                                    }
                                }}
                            />

                            <MultiFactorAuthentication
                                open={mfaOpen}
                                handleOk={async (securityToken) => {
                                    setMfaOpen(false);
                                    setSSHChooserOpen(false);
                                    const key = generateRandomId();
                                    addTab(key, t('access.batch.exec'), <AccessTerminalBulk assetIds={chooseAssetIds}
                                                                                            securityToken={securityToken}/>)
                                }}
                                handleCancel={() => setMfaOpen(false)}
                            />
                        </ThemeProvider>
                    </div>
                </StyleProvider>
            </App>
        </ConfigProvider>
    );
};

export default AccessPage;