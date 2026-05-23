import {
    useEffect,
    useState} from 'react';
import {App,
    Button,
    Dropdown,
    Input,
    Popconfirm,
    Space,
    Table,
    type TableProps,
    Tag,
    Tooltip} from "antd";
import {useTranslation} from "react-i18next";
import {useMutation, useQuery} from "@tanstack/react-query";
import websiteApi, {SortPositionRequest, Website} from "@/api/website-api";
import NButton from "@/components/NButton";
import DraggableTable, {DragHandle} from "@/components/DraggableTable";
import clsx from "clsx";
import {getImgColor} from "@/helper/asset-helper";
import {useNavigate} from "react-router-dom";
import WebsiteDrawer from "@/pages/assets/WebsiteDrawer";
import WebsiteGroupDrawer from "@/pages/assets/WebsiteGroupDrawer";
import AssetGatewayChoose from "@/pages/assets/AssetGatewayChoose";
import WebsiteTree from "./WebsiteTree";
import {cn} from "@/lib/utils";
import {useMobile} from "@/hook/use-mobile";
import {getSort} from "@/utils/sort";
import {PanelLeftCloseIcon, PanelLeftOpenIcon, RefreshCw} from "lucide-react";
import dayjs from "dayjs";

const api = websiteApi;

const WebsitePage = () => {

    const {isMobile} = useMobile();
    const {t} = useTranslation();
    const {message, modal} = App.useApp();
    let [open, setOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>();
    let [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    let [groupId, setGroupId] = useState('');
    let [dataSource, setDataSource] = useState<Website[]>([]);
    let [pagination, setPagination] = useState({current: 1, pageSize: 10, total: 0});
    let [sort, setSort] = useState<Record<string, string | null>>({});
    let [reloadKey, setReloadKey] = useState(0);
    let [keyword, setKeyword] = useState('');
    const [groupDrawerOpen, setGroupDrawerOpen] = useState<boolean>(false);
    const [gatewayChooserOpen, setGatewayChooserOpen] = useState<boolean>(false);
    const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>('');
    const [isTreeCollapsed, setIsTreeCollapsed] = useState<boolean>(() => {
        const saved = localStorage.getItem('website-tree-collapsed');
        return saved ? JSON.parse(saved) : false;
    });

    let navigate = useNavigate();

    const reloadTable = () => {
        setReloadKey((value) => value + 1);
    };

    const resetTableToFirstPage = () => {
        setPagination((prev) => ({...prev, current: 1}));
        reloadTable();
    };

    useEffect(() => {
        localStorage.setItem('website-tree-collapsed', JSON.stringify(isTreeCollapsed));
    }, [isTreeCollapsed]);

    const updateSortMutation = useMutation({
        mutationFn: (req: SortPositionRequest) => api.updateSortPosition(req),
        onSuccess: () => {
            message.success(t('general.success'));
        }
    });

    const handleDragSortEnd = (beforeIndex: number, afterIndex: number, newDataSource: Website[]) => {
        setDataSource(newDataSource);
        const draggedItem = newDataSource[afterIndex];
        const req: SortPositionRequest = {
            id: draggedItem.id,
            beforeId: afterIndex > 0 ? newDataSource[afterIndex - 1].id : '',
            afterId: afterIndex < newDataSource.length - 1 ? newDataSource[afterIndex + 1].id : ''
        };
        updateSortMutation.mutate(req);
    };

    const handleGroupChange = (newGroupId: string) => {
        setGroupId(newGroupId);
        resetTableToFirstPage();
    };

    const websitePagingQuery = useQuery({
        queryKey: ['websites', pagination.current, pagination.pageSize, sort, groupId, keyword, reloadKey],
        queryFn: async () => {
            let [sortOrder, sortField] = getSort(sort);
            if (sortOrder === "" && sortField === "") {
                sortOrder = "desc";
                sortField = "sort";
            }

            return api.getPaging({
                pageIndex: pagination.current,
                pageSize: pagination.pageSize,
                sortOrder: sortOrder,
                sortField: sortField,
                keyword: keyword || undefined,
                groupId: groupId || undefined,
            });
        },
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        if (!websitePagingQuery.data) {
            return;
        }
        setDataSource(websitePagingQuery.data.items);
        setPagination((prev) => ({...prev, total: websitePagingQuery.data.total}));
    }, [websitePagingQuery.data]);

    useEffect(() => {
        if (websitePagingQuery.error) {
            message.error((websitePagingQuery.error as any)?.message);
        }
    }, [websitePagingQuery.error, message]);

    const toggleEnabledMutation = useMutation({
        mutationFn: async (record: Website) => {
            await api.updateEnabled(record.id, !record.enabled);
        },
        onSuccess: () => {
            message.success(t('general.success'));
            reloadTable();
        }
    });

    const renderWebsiteLogo = (record: Website) => {
        if (record.logo === '') {
            return (
                <div
                    className={clsx('w-6 h-6 rounded flex items-center justify-center font-bold text-white text-xs shrink-0', getImgColor('http'))}>
                    {record.name[0]}
                </div>
            );
        }
        return <img src={record.logo} alt={record.name} className="w-6 h-6 shrink-0"/>;
    };

    const renderWebsiteActions = (record: Website, compact = false) => {
        return (
            <div className={cn('flex items-center gap-2', compact && 'gap-1')}>
                {record.enabled ? (
                    <Popconfirm
                        title={t('assets.confirm_disable_website', '确认禁用该网站？')}
                        okText={t('actions.disable', '禁用')}
                        cancelText={t('actions.cancel')}
                        onConfirm={() => toggleEnabledMutation.mutate(record)}
                    >
                        <Button
                            type="link"
                            size="small"
                            danger
                            style={{padding: 0}}
                            loading={toggleEnabledMutation.isPending && toggleEnabledMutation.variables?.id === record.id}
                        >
                            {t('actions.disable', '禁用')}
                        </Button>
                    </Popconfirm>
                ) : (
                    <Button
                        type="link"
                        size="small"
                        style={{padding: 0}}
                        loading={toggleEnabledMutation.isPending && toggleEnabledMutation.variables?.id === record.id}
                        onClick={() => toggleEnabledMutation.mutate(record)}
                    >
                        {t('actions.enable', '启用')}
                    </Button>
                )}
                <NButton
                    key="access"
                    onClick={() => {
                        let url = `/browser?websiteId=${record.id}&t=${new Date().getTime()}`
                        window.open(url, '_blank');
                    }}
                >
                    {compact ? t('assets.access').substring(0, 2) : t('assets.access')}
                </NButton>
                <Dropdown
                    key={`website-actions-${record.id}`}
                    trigger={compact ? ['click'] : ['hover']}
                    menu={{
                        items: [
                            {key: 'config', label: t('actions.config', '配置')},
                            {
                                key: 'view-authorised',
                                label: `${t('actions.authorized')}${t('menus.identity.submenus.user')}`
                            },
                            {key: 'delete', label: t('actions.delete'), danger: true},
                        ],
                        onClick: ({key}) => {
                            switch (key) {
                                case 'config':
                                    navigate(`/website/${record.id}`);
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
                                            await api.deleteById(record.id);
                                            reloadTable();
                                        },
                                    });
                                    break;
                            }
                        }
                    }}
                >
                    <Button type="link" size="small" style={{padding: 0}}>
                        {t('actions.more')}
                    </Button>
                </Dropdown>
            </div>
        );
    };

    const columns: TableProps<Website>['columns'] = [
        {
            title: t('assets.sort'),
            dataIndex: 'sort',
            width: 60,
            className: 'drag-visible',
            fixed: 'left',
            render: () => <DragHandle title={t('assets.sort')}/>,
        },
        {
            title: t('assets.logo'),
            dataIndex: 'logo',
            width: isMobile ? 40 : 60,
            render: (text, record) => {
                return renderWebsiteLogo(record);
            },
            fixed: 'left',
        },
        {
            title: t('general.name'),
            dataIndex: 'name',
            width: 120,
            render: (text, record) => {
                return (
                    <span
                        className={'cursor-pointer text-blue-600 hover:underline'}
                        onClick={() => navigate(`/website/${record.id}`)}
                    >
                        {text}
                    </span>
                );
            },
            fixed: 'left',
        },
        {
            title: t('assets.group'),
            dataIndex: 'groupFullName',
            key: 'groupFullName',
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
        },
        {
            title: t('general.enabled'),
            dataIndex: 'enabled',
            width: 50,
            hidden: isMobile,
            render: (text) => {
                if (text === true) {
                    return <Tag color={'green'} variant="solid">{t('general.yes')}</Tag>
                } else {
                    return <Tag color={'gray'} variant="filled">{t('general.no')}</Tag>
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
                    <Tag variant="filled" color={'blue'} className={cn(isMobile && 'text-xs')}>
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
            hidden: isMobile,
            width: 160,
            render: (value: number) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-',
        },
        {
            title: t('actions.label'),
            key: 'option',
            width: 120,
            render: (text, record) => {
                return renderWebsiteActions(record, isMobile);
            },
            fixed: 'right',
        },
    ];

    const rowSelection: TableProps<Website>['rowSelection'] = {
        selectedRowKeys,
        onChange: (keys) => setSelectedRowKeys(keys as string[]),
        selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT],
    };

    const handleTableChange: TableProps<Website>['onChange'] = (nextPagination, filters, sorter) => {
        const activeSorter = Array.isArray(sorter) ? sorter.find((item) => item.order) : sorter;
        const field = activeSorter?.field;
        const fieldName = Array.isArray(field) ? field.join('.') : field ? String(field) : '';
        setSort(activeSorter?.order && fieldName ? {[fieldName]: activeSorter.order} : {});
        setPagination((prev) => ({
            ...prev,
            current: nextPagination.current || 1,
            pageSize: nextPagination.pageSize || prev.pageSize,
        }));
    };

    const toolbarActions = [
        <Button
            key="refresh"
            loading={websitePagingQuery.isFetching}
            icon={<RefreshCw className="h-4 w-4"/>}
            onClick={reloadTable}
        >
            {t('actions.refresh')}
        </Button>,
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
            setSelectedRowKey(undefined);
            setOpen(true)
        }}>
            {t('actions.new')}
        </Button>
    ].filter(Boolean);

    const batchActions = selectedRowKeys.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 py-3 dark:border-gray-800">
            <span className="text-sm text-gray-500">
                {t('identity.oidc_client.selected_count', {count: selectedRowKeys.length})}
            </span>
            <Space size={16} wrap>
                <NButton
                    onClick={() => {
                        setSelectedWebsiteId(selectedRowKeys[0]);
                        setGroupDrawerOpen(true);
                    }}
                >
                    {t('assets.change_group')}
                </NButton>
                <NButton
                    onClick={() => {
                        setGatewayChooserOpen(true);
                    }}
                >
                    {t('assets.change_gateway')}
                </NButton>
            </Space>
        </div>
    );

    const renderTable = (scroll?: TableProps<Website>['scroll']) => {
        return (
            <div className="overflow-hidden rounded-md bg-white dark:bg-[#141414]">
                <div className={cn(
                    'flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 dark:border-gray-800',
                    isMobile && 'items-stretch'
                )}>
                    <div className="font-medium">{t('menus.resource.submenus.website')}</div>
                    <Space wrap className={cn(isMobile && 'w-full [&_.ant-space-item:first-child]:w-full')}>
                        <Input.Search
                            allowClear
                            placeholder={t('general.search_placeholder')}
                            onSearch={(value) => {
                                setKeyword(value.trim());
                                resetTableToFirstPage();
                            }}
                            style={{width: isMobile ? '100%' : 240}}
                        />
                        <Space wrap className={cn(isMobile && 'w-full')}>
                            {toolbarActions}
                        </Space>
                    </Space>
                </div>
                {batchActions}
                <DraggableTable<Website>
                    columns={columns}
                    dataSource={dataSource}
                    loading={websitePagingQuery.isFetching}
                    rowKey="id"
                    rowSelection={rowSelection}
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        showSizeChanger: !isMobile,
                    }}
                    onChange={handleTableChange}
                    onDragSortEnd={handleDragSortEnd}
                    scroll={scroll}
                    size="small"
                />
            </div>
        );
    };

    const treeCollapseTitle = isTreeCollapsed ? t('assets.expand_group_tree') : t('assets.collapse_group_tree');

    return (<div>
        <div>
            {isMobile ? (
                <div className="space-y-3">
                    <div className="max-h-[38vh] overflow-auto rounded-md bg-white dark:bg-gray-800">
                        <WebsiteTree
                            selected={groupId}
                            onSelect={handleGroupChange}
                        />
                    </div>
                    {renderTable({x: 760})}
                </div>
            ) : (
                <div className={cn(
                    "grid gap-4 transition-all duration-300",
                    isTreeCollapsed ? "grid-cols-[48px_1fr]" : "grid-cols-[240px_1fr]"
                )}>
                    <div className="relative flex min-h-[240px] flex-col rounded-md bg-gray-50 dark:bg-[#141414]">
                        {!isTreeCollapsed && (
                            <div className="flex-1">
                                <WebsiteTree
                                    selected={groupId}
                                    onSelect={handleGroupChange}
                                />
                            </div>
                        )}

                        <div
                            className={cn(
                                'mt-auto border-t border-gray-100 px-2 py-1.5 dark:border-gray-800',
                                isTreeCollapsed && 'flex justify-center border-t-0 pt-2'
                            )}
                        >
                            <Tooltip title={treeCollapseTitle} placement={isTreeCollapsed ? 'right' : 'top'}>
                                <button
                                    type="button"
                                    aria-label={treeCollapseTitle}
                                    className={cn(
                                        'flex h-7 items-center justify-center rounded text-gray-400 cursor-pointer hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors',
                                        isTreeCollapsed ? 'w-7' : 'w-full gap-1.5 text-xs'
                                    )}
                                    onClick={() => setIsTreeCollapsed(!isTreeCollapsed)}
                                >
                                    {isTreeCollapsed ? (
                                        <PanelLeftOpenIcon className={'w-4 h-4'}/>
                                    ) : (
                                        <>
                                            <PanelLeftCloseIcon className={'w-4 h-4'}/>
                                            <span>{treeCollapseTitle}</span>
                                        </>
                                    )}
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                    <div className="overflow-hidden rounded-md">
                        {renderTable({x: 'max-content'})}
                    </div>
                </div>
            )}

        </div>

        <WebsiteDrawer
            id={selectedRowKey}
            open={open}
            onClose={() => {
                setOpen(false);
                setSelectedRowKey(undefined);
            }}
            onSuccess={() => {
                reloadTable();
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
                reloadTable();
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
                reloadTable();
            }}
        />
    </div>);
};

export default WebsitePage;
