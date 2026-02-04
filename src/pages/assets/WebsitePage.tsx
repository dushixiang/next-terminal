import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {App, Button, Modal, Space, Table, Tag} from "antd";
import {ActionType, DragSortTable, ProColumns, TableDropdown} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {useMutation, useQuery} from "@tanstack/react-query";
import websiteApi, {SortPositionRequest, Website} from "@/api/website-api";
import NButton from "@/components/NButton";
import clsx from "clsx";
import {getImgColor} from "@/helper/asset-helper";
import {useNavigate, useSearchParams} from "react-router-dom";
import WebsiteDrawer from "@/pages/assets/WebsiteDrawer";
import WebsiteGroupDrawer from "@/pages/assets/WebsiteGroupDrawer";
import AssetGatewayChoose from "@/pages/assets/AssetGatewayChoose";
import WebsiteTree from "./WebsiteTree";
import {cn} from "@/lib/utils";
import {useMobile} from "@/hook/use-mobile";
import {getSort} from "@/utils/sort";
import {PanelLeftCloseIcon, PanelLeftOpenIcon} from "lucide-react";
import dayjs from "dayjs";
import websiteTempAllowApi, {WebsiteTempAllowEntry} from "@/api/website-temp-allow-api";

const api = websiteApi;

const WebsitePage = () => {

    const {isMobile} = useMobile();
    const {t} = useTranslation();
    const {message, modal} = App.useApp();
    const actionRef = useRef<ActionType>(null);
    let [open, setOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>();
    let [searchParams, setSearchParams] = useSearchParams();
    const queryState = useMemo(() => {
        const obj: Record<string, string> = {};
        searchParams.forEach((value, key) => {
            obj[key] = value;
        });
        return obj;
    }, [searchParams]);

    const applyQueryPatch = useCallback((patch: Record<string, string | undefined>) => {
        const next: Record<string, string> = {...queryState};
        Object.entries(patch).forEach(([key, value]) => {
            if (value) {
                next[key] = value;
            } else {
                delete next[key];
            }
        });
        const sameSize = Object.keys(next).length === Object.keys(queryState).length;
        const isSame = sameSize && Object.entries(next).every(([key, value]) => queryState[key] === value);
        if (isSame) {
            return;
        }
        setSearchParams(next);
    }, [queryState, setSearchParams]);
    let [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    let [groupId, setGroupId] = useState(searchParams.get('groupId') || '');
    let [dataSource, setDataSource] = useState<Website[]>([]);
    const [groupDrawerOpen, setGroupDrawerOpen] = useState<boolean>(false);
    const [gatewayChooserOpen, setGatewayChooserOpen] = useState<boolean>(false);
    const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>('');
    const [tempAllowOpen, setTempAllowOpen] = useState<boolean>(false);
    const [tempAllowWebsite, setTempAllowWebsite] = useState<Website | null>(null);
    const [isTreeCollapsed, setIsTreeCollapsed] = useState<boolean>(() => {
        const saved = localStorage.getItem('website-tree-collapsed');
        return saved ? JSON.parse(saved) : false;
    });

    let navigate = useNavigate();
    const containerRef = useRef(null);

    const websiteIdFromUrl = queryState.websiteId;

    useEffect(() => {
        localStorage.setItem('website-tree-collapsed', JSON.stringify(isTreeCollapsed));
    }, [isTreeCollapsed]);

    useEffect(() => {
        if (websiteIdFromUrl) {
            setOpen(true);
            setSelectedRowKey(websiteIdFromUrl);
        }
    }, [websiteIdFromUrl]);

    const tempAllowQuery = useQuery({
        queryKey: ['website-temp-allow', tempAllowWebsite?.id],
        queryFn: () => websiteTempAllowApi.list(tempAllowWebsite!.id),
        enabled: tempAllowOpen && !!tempAllowWebsite?.id,
    });

    const updateSortMutation = useMutation({
        mutationFn: (req: SortPositionRequest) => api.updateSortPosition(req),
        onSuccess: () => {
            message.success(t('general.success'));
        }
    });

    const handleDragSortEnd = (beforeIndex: number, afterIndex: number, newDataSource: Website[]) => {
        console.log('Sort operation', {beforeIndex, afterIndex});

        // 立即更新本地状态，避免闪烁
        setDataSource(newDataSource);

        // 获取被拖拽的项
        const draggedItem = newDataSource[afterIndex];

        // 因为使用 DESC 排序，sort 大的在前面
        const req: SortPositionRequest = {
            id: draggedItem.id,
            // 前一项的 sort 更大（DESC 排序）
            beforeId: afterIndex > 0 ? newDataSource[afterIndex - 1].id : '',
            // 后一项的 sort 更小（DESC 排序）
            afterId: afterIndex < newDataSource.length - 1 ? newDataSource[afterIndex + 1].id : ''
        };

        console.log('Sort request', req);

        // 服务器更新
        updateSortMutation.mutate(req);
    };

    const openWebsiteEditor = (websiteId: string) => {
        setOpen(true);
        setSelectedRowKey(websiteId);
        applyQueryPatch({websiteId});
    };

    const openTempAllowManager = (record: Website) => {
        setTempAllowWebsite(record);
        setTempAllowOpen(true);
    };

    const closeTempAllowManager = () => {
        setTempAllowOpen(false);
        setTempAllowWebsite(null);
    };

    const formatRemaining = (seconds?: number) => {
        if (!seconds || seconds <= 0) {
            return '-';
        }
        if (seconds < 60) {
            return `${seconds}s`;
        }
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (minutes < 60) {
            return `${minutes}m ${secs}s`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const tempAllowColumns = [
        {
            title: 'IP',
            dataIndex: 'ip',
            key: 'ip',
            width: 160,
        },
        {
            title: t('assets.temp_allow_expires'),
            dataIndex: 'expiresAt',
            key: 'expiresAt',
            width: 200,
            render: (value: number) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-',
        },
        {
            title: t('assets.temp_allow_remaining'),
            dataIndex: 'remainingSeconds',
            key: 'remainingSeconds',
            width: 120,
            render: (value: number) => formatRemaining(value),
        },
        {
            title: t('actions.label'),
            key: 'option',
            width: 100,
            render: (_: any, record: WebsiteTempAllowEntry) => (
                <Button
                    type="link"
                    danger
                    size="small"
                    onClick={() => {
                        modal.confirm({
                            title: t('general.confirm_delete'),
                            okText: t('actions.delete'),
                            okButtonProps: {danger: true},
                            onOk: async () => {
                                if (!tempAllowWebsite) {
                                    return;
                                }
                                await websiteTempAllowApi.remove(tempAllowWebsite.id, record.ip);
                                tempAllowQuery.refetch();
                            },
                        });
                    }}
                >
                    {t('actions.delete')}
                </Button>
            ),
        },
    ];

    useEffect(() => {
        applyQueryPatch({
            groupId: groupId || undefined,
        });
        actionRef.current?.setPageInfo({
            pageSize: 10,
            current: 1,
        });
        actionRef.current?.reload();

    }, [applyQueryPatch, groupId]);

    const columns: ProColumns<Website>[] = [
        {
            title: t('assets.sort'),
            dataIndex: 'sort',
            width: 60,
            className: 'drag-visible',
            hideInSearch: true,
        },
        {
            title: t('assets.logo'),
            dataIndex: 'logo',
            hideInSearch: true,
            width: isMobile ? 40 : 60,
            render: (text, record) => {
                if (record.logo === '') {
                    return <div
                        className={clsx(`w-6 h-6 rounded flex items-center justify-center font-bold text-white text-xs`, getImgColor('http'))}>
                        {record.name[0]}
                    </div>
                }
                return <img src={record.logo} alt={record['name']} className={'w-6 h-6'}/>;
            }
        },
        {
            title: t('general.name'),
            dataIndex: 'name',
            width: 120,
            render: (text, record) => {
                return (
                    <span
                        className={'cursor-pointer text-blue-600 hover:underline'}
                        onClick={() => openWebsiteEditor(record.id)}
                    >
                        {text}
                    </span>
                );
            },
        },
        {
            title: t('assets.group'),
            dataIndex: 'groupFullName',
            key: 'groupFullName',
            width: isMobile ? 80 : 150,
            render: (text, record) => {
                return <div className={cn(
                    'cursor-pointer hover:text-blue-500 underline',
                    isMobile && 'text-xs line-clamp-2'
                )}
                            onClick={() => {
                                setSelectedWebsiteId(record.id);
                                setGroupDrawerOpen(true);
                            }}
                >
                    {text || t('assets.default_group')}
                </div>
            },
            hideInSearch: true,
        },
        {
            title: t('general.enabled'),
            dataIndex: 'enabled',
            hideInSearch: true,
            width: 50,
            hideInTable: isMobile, // 移动端隐藏启用状态列
            render: (text) => {
                if (text === true) {
                    return <Tag color={'green-inverse'} bordered={false}>{t('general.yes')}</Tag>
                } else {
                    return <Tag color={'gray'} bordered={false}>{t('general.no')}</Tag>
                }
            }
        },
        {
            title: t('assets.domain'),
            dataIndex: 'domain',
            key: 'domain',
            width: isMobile ? 150 : 300,
            render: (text, record) => {
                return <div>
                    <Tag bordered={false} color={'blue'} className={cn(isMobile && 'text-xs')}>
                        {isMobile ?
                            <div className="line-clamp-2">{record.domain}</div> :
                            record.domain + ' -> ' + record.targetUrl
                        }
                    </Tag>
                </div>
            }
        },
        {
            title: t('general.created_at'),
            key: 'createdAt',
            dataIndex: 'createdAt',
            hideInSearch: true,
            hideInTable: isMobile, // 移动端隐藏创建时间列
            width: 160,
            valueType: 'dateTime'
        },
        {
            title: t('actions.label'),
            valueType: 'option',
            key: 'option',
            width: 160,
            render: (text, record, _, action) => [
                <NButton
                    key="access"
                    onClick={() => {
                        let url = `/browser?websiteId=${record.id}&t=${new Date().getTime()}`
                        window.open(url, '_blank');
                    }}
                >
                    {isMobile ? t('assets.access').substring(0, 2) : t('assets.access')}
                </NButton>,
                <TableDropdown
                    key={`website-actions-${record.id}`}
                    onSelect={(key) => {
                        switch (key) {
                            case 'edit':
                                openWebsiteEditor(record.id);
                                break;
                            case 'temp-allow':
                                openTempAllowManager(record);
                                break;
                            case 'view-authorised':
                                navigate(`/authorised-website?websiteId=${record.id}`);
                                break;
                            case 'delete':
                                modal.confirm({
                                    title: t('general.confirm_delete'),
                                    okText: t('actions.delete'),
                                    okButtonProps: {danger: true},
                                    onOk: async () => {
                                        if (queryState.websiteId === record.id) {
                                            applyQueryPatch({websiteId: undefined});
                                            setOpen(false);
                                            setSelectedRowKey(undefined);
                                        }
                                        await api.deleteById(record.id);
                                        actionRef.current?.reload();
                                    },
                                });
                                break;
                        }
                    }}
                    menus={[
                        {key: 'edit', name: t('actions.edit')},
                        {key: 'temp-allow', name: t('assets.temp_allow')},
                        {
                            key: 'view-authorised',
                            name: `${t('actions.authorized')}${t('menus.identity.submenus.user')}`
                        },
                        {key: 'delete', name: t('actions.delete'), danger: true},
                    ]}
                />,
            ],
        },
    ];

    // 统一的 ProTable 配置
    const tableProps = {
        columns,
        actionRef,
        request: async (params: any = {}, sort: any, filter: any) => {
            let [sortOrder, sortField] = getSort(sort);
            if (sortOrder === "" && sortField === "") {
                sortOrder = "desc";  // 使用降序，让最大的 sort 显示在最上面
                sortField = "sort";
            }

            let queryParams = {
                pageIndex: params.current,
                pageSize: params.pageSize,
                sortOrder: sortOrder,
                sortField: sortField,
                name: params.name,
                groupId: groupId || undefined,
            }
            let result = await api.getPaging(queryParams);
            setDataSource(result['items']);
            return {
                data: result['items'],
                success: true,
                total: result['total']
            };
        },
        dataSource: dataSource,
        dragSortKey: "sort",
        onDragSortEnd: handleDragSortEnd,
        rowSelection: {
            selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT],
        },
        tableAlertOptionRender: ({selectedRowKeys}: any) => {
            return (
                <Space size={16}>
                    <NButton
                        onClick={() => {
                            setSelectedRowKeys(selectedRowKeys as string[]);
                            setSelectedWebsiteId(selectedRowKeys[0]);
                            setGroupDrawerOpen(true);
                        }}
                    >
                        {t('assets.change_group')}
                    </NButton>
                    <NButton
                        onClick={() => {
                            setSelectedRowKeys(selectedRowKeys as string[]);
                            setGatewayChooserOpen(true);
                        }}
                    >
                        {t('assets.change_gateway')}
                    </NButton>
                </Space>
            );
        },
        rowKey: "id" as const,
        search: {
            labelWidth: 'auto' as const,
        },
        pagination: {
            defaultPageSize: 10,
            showSizeChanger: !isMobile // 移动端隐藏页面大小选择器
        },
        dateFormatter: "string" as const,
        headerTitle: t('menus.resource.submenus.website'),
        toolBarRender: () => [
            <Button
                key="auth"
                onClick={() => {
                    navigate('/authorised-website');
                }}
                color={'purple'}
                variant={'dashed'}
            >
                {t('actions.authorized')}
            </Button>,
            groupId && (
                <Button
                    key="group-auth"
                    onClick={() => navigate(`/authorised-website?websiteGroupId=${groupId}`)}
                >
                    {`${t('authorised.label.website_group')}${t('actions.authorized')}`}
                </Button>
            ),
            <Button key="button" type="primary" onClick={() => {
                applyQueryPatch({websiteId: undefined});
                setSelectedRowKey(undefined);
                setOpen(true)
            }}>
                {t('actions.new')}
            </Button>
        ]
    };

    return (<div>
        <div className={cn('px-4', isMobile && 'px-2')} ref={containerRef}>
            {/* 移动端网站树 - 在表格上方显示 */}
            {isMobile && (
                <>
                    <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg">
                        <WebsiteTree
                            selected={groupId}
                            onSelect={setGroupId}
                        />
                    </div>
                    <DragSortTable {...tableProps}/>
                </>
            )}

            {/* 桌面端使用 Grid 布局 */}
            {!isMobile && (
                <div className={cn(
                    "grid gap-4 transition-all duration-300",
                    isTreeCollapsed ? "grid-cols-[48px_1fr]" : "grid-cols-[240px_1fr]"
                )}>
                    <div className="relative border rounded-md dark:bg-[#141414]">
                        {!isTreeCollapsed && (
                            <WebsiteTree
                                selected={groupId}
                                onSelect={setGroupId}
                            />
                        )}

                        <div
                            className={cn(
                                'absolute top-4 bg-gray-100 p-1.5 rounded dark:bg-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
                                isTreeCollapsed ? 'left-2' : 'right-4'
                            )}
                            onClick={() => setIsTreeCollapsed(!isTreeCollapsed)}
                        >
                            {isTreeCollapsed ? (
                                <PanelLeftOpenIcon className={'w-4 h-4'}/>
                            ) : (
                                <PanelLeftCloseIcon className={'w-4 h-4'}/>
                            )}
                        </div>
                    </div>
                    <div className="overflow-hidden rounded-md border">
                        <DragSortTable {...tableProps}
                                       scroll={{
                                           x: 'max-content'
                                       }}
                        />
                    </div>
                </div>
            )}

        </div>

        <WebsiteDrawer
            id={selectedRowKey}
            open={open}
            onClose={() => {
                applyQueryPatch({websiteId: undefined});
                setOpen(false);
                setSelectedRowKey(undefined);
            }}
            onSuccess={() => {
                // 刷新列表等操作
                actionRef.current?.reload();
            }}
        />

        <WebsiteGroupDrawer
            open={groupDrawerOpen}
            onClose={() => {
                setGroupDrawerOpen(false);
                setSelectedWebsiteId('');
                setSelectedRowKeys([]);
            }}
            websiteIds={selectedRowKeys.length > 0 ? selectedRowKeys : [selectedWebsiteId]}
            onSuccess={() => {
                actionRef.current?.reload();
                setSelectedRowKeys([]);
            }}
        />

        <AssetGatewayChoose
            resourceIds={selectedRowKeys}
            type="website"
            open={gatewayChooserOpen}
            onClose={() => {
                setGatewayChooserOpen(false);
                setSelectedRowKeys([]);
                actionRef.current?.reload();
            }}
        />

        <Modal
            title={tempAllowWebsite ? `${tempAllowWebsite.name} · ${t('assets.temp_allow')}` : t('assets.temp_allow')}
            open={tempAllowOpen}
            onCancel={closeTempAllowManager}
            footer={null}
            width={720}
            destroyOnClose
        >
            <Table
                rowKey={(record) => `${record.websiteId}-${record.ip}`}
                loading={tempAllowQuery.isFetching}
                dataSource={tempAllowQuery.data || []}
                columns={tempAllowColumns}
                pagination={false}
                size="small"
            />
        </Modal>
    </div>);
};

export default WebsitePage;
