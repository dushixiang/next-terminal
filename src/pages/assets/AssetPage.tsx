import {type CSSProperties, useEffect, useState} from 'react';

import assetsApi, {Asset, SortPositionRequest} from '@/api/asset-api';
import {baseUrl} from "@/api/core/requests";
import portalApi, {AssetAccessMode} from "@/api/portal-api";
import DraggableTable, {DragHandle} from "@/components/DraggableTable";
import NButton from "@/components/NButton";
import {getImgColor, getProtocolColor} from "@/helper/asset-helper";
import {useMobile} from "@/hook/use-mobile";
import {cn} from "@/lib/utils";
import AssetBatchEditDrawer from "@/pages/assets/AssetBatchEditDrawer";
import AssetPostDrawer from "@/pages/assets/AssetPostDrawer";
import AssetRotateModal from "@/pages/assets/AssetRotateModal";
import RotationResultModal from "@/pages/assets/RotationResultModal";
import AssetTree from "@/pages/assets/AssetTree";
import AssetTreeChoose from "@/pages/assets/AssetTreeChoose";
import MultiFactorAuthentication from '@/pages/account/MultiFactorAuthentication';
import {safeEncode} from "@/utils/codec";
import {getSort} from "@/utils/sort";
import {browserDownload} from "@/utils/utils";
import {useMutation, useQuery} from "@tanstack/react-query";
import {
    App,
    Badge,
    Switch,
    Button,
    Dropdown,
    Input,
    Popover,
    Segmented,
    Space,
    Table,
    type TableProps,
    Tag,
    Tooltip,
    Upload
} from "antd";
import clsx from "clsx";
import i18n from "i18next";
import {PanelLeftCloseIcon, PanelLeftOpenIcon, RefreshCw} from "lucide-react";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import type {RotationResult} from "@/api/credential-rotation-api";

const api = assetsApi;

function downloadImportExampleCsv() {
    browserDownload(`${baseUrl()}/admin/assets/sample?language=${encodeURIComponent(i18n.language)}`)
}

function downloadAssets() {
    browserDownload(`${baseUrl()}/admin/assets/export?language=${encodeURIComponent(i18n.language)}`)
}

interface PostParams {
    open: boolean;
    assetId?: string;
    groupId?: string;
    copy?: boolean;
}

const AssetPage = () => {

    const {isMobile} = useMobile();

    let [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    let [groupId, setGroupId] = useState('');
    let [dataSource, setDataSource] = useState<Asset[]>([]);
    let [pagination, setPagination] = useState({current: 1, pageSize: 10, total: 0});
    let [sort, setSort] = useState<Record<string, string | null>>({});
    let [keyword, setKeyword] = useState('');
    let [selectedTags, setSelectedTags] = useState<string[]>([]);
    let [selectedStatus, setSelectedStatus] = useState<string>('');
    let [groupChooserOpen, setGroupChooserOpen] = useState(false);
    let [batchEditorOpen, setBatchEditorOpen] = useState(false);
    let [rotateOpen, setRotateOpen] = useState(false);
    let [rotationResults, setRotationResults] = useState<RotationResult[]>([]);
    const [rdpMfaOpen, setRdpMfaOpen] = useState(false);
    const [pendingRdpAssetId, setPendingRdpAssetId] = useState('');
    let [params, setParams] = useState<PostParams>({
        open: false,
        assetId: undefined,
        groupId: undefined,
        copy: false,
    });

    let navigate = useNavigate();
    let {t} = useTranslation();
    let {modal, message} = App.useApp();

    const resetTableToFirstPage = () => {
        setPagination((prev) => ({...prev, current: 1}));
    };

    const [isTreeCollapsed, setIsTreeCollapsed] = useState<boolean>(() => {
        const saved = localStorage.getItem('asset-tree-collapsed');
        return saved ? JSON.parse(saved) : false;
    });
    const [treeWidth, setTreeWidth] = useState<number>(() => {
        const saved = Number(localStorage.getItem('asset-tree-width'));
        return saved >= 200 && saved <= 420 ? saved : 240;
    });
    const [treeResizeStart, setTreeResizeStart] = useState<{x: number; width: number}>();

    useEffect(() => {
        localStorage.setItem('asset-tree-collapsed', JSON.stringify(isTreeCollapsed));
    }, [isTreeCollapsed]);

    useEffect(() => {
        localStorage.setItem('asset-tree-width', String(treeWidth));
    }, [treeWidth]);

    useEffect(() => {
        if (!treeResizeStart) {
            return;
        }

        const handleMouseMove = (event: MouseEvent) => {
            const nextWidth = treeResizeStart.width + event.clientX - treeResizeStart.x;
            setTreeWidth(Math.min(420, Math.max(200, nextWidth)));
        };
        const handleMouseUp = () => setTreeResizeStart(undefined);

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [treeResizeStart]);

    const tagsQuery = useQuery({
        queryKey: ['tags'],
        queryFn: assetsApi.getTags,
        refetchOnWindowFocus: false,
    });
    const tags = (tagsQuery.data ?? []).filter(t => t !== '-');

    let queryAccessPreferences = useQuery({
        queryKey: ['access-preferences'],
        queryFn: () => portalApi.getAccessPreferences(),
        staleTime: 5 * 60 * 1000,
    });

    let testingMutation = useMutation({
        mutationFn: assetsApi.checking,
        onSuccess: () => {
            assetPagingQuery.refetch();
        }
    });

    const updateSortMutation = useMutation({
        mutationFn: (req: SortPositionRequest) => assetsApi.updateSortPosition(req),
        onSuccess: () => {
            message.success(t('general.success'));
        }
    });

    const createRdpProxyTicketMutation = useMutation({
        mutationFn: ({assetId, securityToken}: {assetId: string; securityToken?: string}) =>
            portalApi.createRdpProxyTicket(assetId, securityToken),
        onSuccess: (ticket) => {
            browserDownload(ticket.rdpFileUrl);
        },
        onError: (error: any) => {
            if (error?.code === 10027) {
                setRdpMfaOpen(true);
                return;
            }
            message.error(error?.message || t('general.failed'));
        }
    });

    const handleDragSortEnd = (_beforeIndex: number, afterIndex: number, newDataSource: Asset[]) => {
        setDataSource(newDataSource);
        const draggedItem = newDataSource[afterIndex];
        const req: SortPositionRequest = {
            id: draggedItem.id,
            beforeId: afterIndex > 0 ? newDataSource[afterIndex - 1].id : '',
            afterId: afterIndex < newDataSource.length - 1 ? newDataSource[afterIndex + 1].id : ''
        };
        updateSortMutation.mutate(req);
    };

    const importExampleContent = <>
        <NButton onClick={downloadImportExampleCsv}>{t('actions.download_import_sample')}</NButton>
        <div>{t('assets.import_asset_tip')}</div>
        <div>{t('assets.import_asset_group_tip')}</div>
    </>

    const openAssetEditor = (assetId?: string, options?: Partial<PostParams>) => {
        setParams({
            open: true,
            assetId,
            groupId: options?.groupId ?? (!assetId ? groupId : undefined),
            copy: options?.copy ?? false,
        });
    };

    const buildAssetAccessHref = (record: Asset) => {
        const protocol = record.protocol?.toLowerCase();
        const accessMode: AssetAccessMode = queryAccessPreferences.data?.assetAccessMode || 'access-page';
        if (accessMode === 'standalone-page') {
            return `/standalone-access?assetId=${record.id}&protocol=${protocol}&t=${new Date().getTime()}`;
        }
        const msg = {
            id: record.id,
            name: record.name,
            protocol: protocol,
            status: record.status,
            wolEnabled: record.attrs?.['wol-enabled'] || false,
        };
        return `/access?asset=${safeEncode(msg)}`;
    };

    const handleRdpProxyAccess = (record: Asset) => {
        setPendingRdpAssetId(record.id);
        createRdpProxyTicketMutation.mutate({assetId: record.id});
    };

    const handleGroupChange = (newGroupId: string) => {
        setGroupId(newGroupId);
        resetTableToFirstPage();
    };

    const handleTagChange = (newTags: string[]) => {
        setSelectedTags(newTags);
        resetTableToFirstPage();
    };

    const handleStatusChange = (newStatus: string) => {
        setSelectedStatus(newStatus);
        resetTableToFirstPage();
    };

    const getStatusBadge = (record: Asset) => {
        switch (record.status) {
            case 'testing':
                return <Badge status="processing" text={t('assets.testing')}/>;
            case 'active':
                return <Badge status="success" text={t('assets.active')}/>;
            case 'inactive':
                return (
                    <Tooltip title={record.statusText}>
                        <Badge status="error" text={t('general.offline')}/>
                    </Tooltip>
                );
            default:
                return undefined;
        }
    };

    const assetPagingQuery = useQuery({
        queryKey: ['assets', pagination.current, pagination.pageSize, sort, groupId, selectedTags, selectedStatus, keyword],
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
                tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined,
                groupId: groupId,
                status: selectedStatus || undefined,
            });
        },
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        if (!assetPagingQuery.data) {
            return;
        }
        setDataSource(assetPagingQuery.data.items);
        setPagination((prev) => ({...prev, total: assetPagingQuery.data.total}));
    }, [assetPagingQuery.data]);

    useEffect(() => {
        if (assetPagingQuery.error) {
            message.error((assetPagingQuery.error as any)?.message);
        }
    }, [assetPagingQuery.error, message]);

    const toggleEnabledMutation = useMutation({
        mutationFn: (record: Asset) => api.updateEnabled(record.id, !record.enabled),
        onSuccess: () => {
            message.success(t('general.success'));
            assetPagingQuery.refetch();
        },
    });

    const columns: TableProps<Asset>['columns'] = [
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
            render: (_text, record) => {
                return renderAssetLogo(record);
            },
            fixed: 'left',
        },
        {
            title: t('general.name'),
            dataIndex: 'name',
            sorter: true,
            width: isMobile ? 120 : 200,
            render: (text, record) => {
                return <div className={'flex flex-col'}>
                    <span
                        className={'cursor-pointer text-blue-600 hover:underline'}
                        onClick={() => openAssetEditor(record.id)}
                    >
                        {text}
                    </span>
                    {record.alias && (
                        <Tooltip title={record.alias}>
                            <div className={'text-gray-500 text-xs line-clamp-1'}>{record.alias}</div>
                        </Tooltip>
                    )}
                    {!isMobile && (
                        <Tooltip title={record.description}>
                            <div className={'text-gray-500 line-clamp-1'}>{record.description}</div>
                        </Tooltip>
                    )}
                </div>
            },
            fixed: 'left',
        },
        {
            title: t('general.enabled'),
            dataIndex: 'enabled',
            width: 80,
            render: (_value, record) => (
                <Switch
                    checked={record.enabled}
                    checkedChildren={t('general.yes')}
                    unCheckedChildren={t('general.no')}
                    loading={toggleEnabledMutation.isPending && toggleEnabledMutation.variables?.id === record.id}
                    disabled={toggleEnabledMutation.isPending}
                    onChange={() => toggleEnabledMutation.mutate(record)}
                />
            ),
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
                                setGroupChooserOpen(true);
                                setSelectedRowKeys([record.id]);
                            }}
                >
                    {text}
                </div>
            },
        },
        {
            title: t('assets.protocol'),
            dataIndex: 'protocol',
            key: 'protocol',
            sorter: true,
            width: isMobile ? 60 : 80,
            render: (_text, record) => {
                return <span
                    className={clsx('rounded-md px-1.5 py-1 text-white font-bold', getProtocolColor(record.protocol))}
                    style={{fontSize: isMobile ? 8 : 9}}>
                        {record.protocol.toUpperCase()}
                    </span>
            },
        },
        {
            title: t('assets.network'),
            dataIndex: 'network',
            key: 'network',
            width: isMobile ? 90 : 160,
            hidden: isMobile,
            render: (_text, record) => {
                return `${record['ip'] + ':' + record['port']}`;
            }
        },
        {
            title: t('assets.tags'),
            dataIndex: 'tags',
            key: 'tags',
            width: isMobile ? 80 : 120,
            hidden: isMobile,
            render: tags => {
                if (tags == '-') {
                    return undefined;
                }
                if (tags) {
                    let items = tags as string[];
                    return items?.map(tag => <Tag key={tag}>{tag}</Tag>);
                }
            },
        },
        {
            title: t('general.status'),
            dataIndex: 'status',
            key: 'status',
            sorter: true,
            width: isMobile ? 70 : 100,
            render: (_status, record) => {
                return getStatusBadge(record);
            },
        },
        {
            title: t('actions.label'),
            key: 'option',
            width: 120,
            render: (_text, record) => {
                return renderAssetActions(record, isMobile);
            },
            fixed: 'right'
        },
    ];

    const handleImportAsset = async (file: any) => {
        let data = await api.importAsset(file);
        let error = data['error'];
        let errorAssets = data['errorAssets'];
        if (error === '') {
            modal.success({
                title: t('assets.import_asset_success'),
                content: t('general.success')
            })
        } else {
            modal.error({
                title: t('assets.import_asset_error'),
                content: <div>
                    <p>{t('assets.import_asset_error_title')}</p>
                    <hr className="h-px my-2 bg-gray-200 border-0 dark:bg-gray-700"/>
                    <ul>
                        {
                            errorAssets.map((item: any) => {
                                return <li>{item['name']}：{item['error']}</li>
                            })
                        }
                    </ul>
                </div>

            })
        }
        assetPagingQuery.refetch();
        return false;
    }

    const renderAssetLogo = (record: Asset) => {
        if (record.logo === '') {
            return (
                <div
                    className={clsx('w-6 h-6 rounded flex items-center justify-center font-bold text-white text-xs shrink-0', getImgColor(record.protocol))}>
                    {record.name[0]}
                </div>
            );
        }
        return <img src={record.logo} alt={record.name} className="w-6 h-6 shrink-0"/>;
    };

    const renderAssetActions = (record: Asset, compact = false) => {
        const id = record.id;
        const isRdpAsset = record.protocol?.toLowerCase() === 'rdp' && queryAccessPreferences.data?.rdpProxyEnabled === true;
        const isCreatingRdpProxyTicket = createRdpProxyTicketMutation.isPending && createRdpProxyTicketMutation.variables?.assetId === id;
        return (
            <div className={cn('flex items-center gap-2', compact && 'gap-1')}>
                <Button
                    key={`btn-access-${id}`}
                    type="link"
                    disabled={!record.enabled}
                    size="small"
                    href={buildAssetAccessHref(record)}
                    style={{padding: 0}}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {compact ? t('assets.access').substring(0, 2) : t('assets.access')}
                </Button>
                <Dropdown
                    key={`perm-action-${id}`}
                    trigger={compact ? ['click'] : ['hover']}
                    menu={{
                        items: [
                            ...(isRdpAsset ? [{
                                key: 'rdp-proxy',
                                label: t('assets.rdp_proxy_access'),
                                disabled: !record.enabled || isCreatingRdpProxyTicket,
                            }] : []),
                            {key: 'copy', label: t('assets.copy')},
                            {key: 'edit', label: t('actions.edit')},
                            {
                                key: 'view-authorised-asset',
                                label: `${t('actions.authorized')}${t('menus.identity.submenus.user')}`
                            },
                            {key: 'delete', label: t('actions.delete'), danger: true},
                        ],
                        onClick: ({key}) => {
                            switch (key) {
                                case 'rdp-proxy':
                                    handleRdpProxyAccess(record);
                                    break;
                                case "copy":
                                    openAssetEditor(record.id, {groupId: record.groupId, copy: true});
                                    break;
                                case "edit":
                                    openAssetEditor(record.id);
                                    break;
                                case 'view-authorised-asset':
                                    navigate(`/authorised-asset?assetId=${record.id}`);
                                    break;
                                case 'delete':
                                    modal.confirm({
                                        title: t('general.confirm_delete'),
                                        okText: t('actions.delete'),
                                        onOk: async () => {
                                            await api.deleteById(record.id);
                                            assetPagingQuery.refetch();
                                        },
                                    });
                                    break;
                            }
                        }
                    }}
                >
                    <Button
                        type="link"
                        size="small"
                        style={{padding: 0}}
                    >
                        {t('actions.more')}
                    </Button>
                </Dropdown>
            </div>
        );
    };

    const rowSelection: TableProps<Asset>['rowSelection'] = {
        selectedRowKeys,
        onChange: (keys) => setSelectedRowKeys(keys as string[]),
        selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT],
    };

    const handleTableChange: TableProps<Asset>['onChange'] = (nextPagination, _filters, sorter) => {
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

    const statusFilter = (
        <Segmented
            key="status-filter"
            block={isMobile}
            value={selectedStatus}
            onChange={(value) => handleStatusChange(value as string)}
            options={[
                {value: '', label: t('general.all')},
                {value: 'active', label: t('assets.active')},
                {value: 'inactive', label: t('general.offline')},
            ]}
        />
    );

    const toolbarActions = [
        <Button
            key="refresh"
            loading={assetPagingQuery.isFetching}
            icon={<RefreshCw className="h-4 w-4"/>}
            onClick={() => assetPagingQuery.refetch()}
        >
            {t('actions.refresh')}
        </Button>,
        <Button
            key="auth"
            onClick={() => {
                navigate('/authorised-asset');
            }}
            color={'purple'}
            variant={'dashed'}
        >
            {t('actions.authorized')}
        </Button>,
        groupId && (
            <Button
                key="group-auth"
                onClick={() => navigate(`/authorised-asset?assetGroupId=${groupId}`)}
            >
                {`${t('authorised.label.asset_group')}${t('actions.authorized')}`}
            </Button>
        ),
        <Button key="add"
                type="primary"
                onClick={() => openAssetEditor()}
        >
            {t('actions.new')}
        </Button>,
        <Popover key="import" content={importExampleContent}>
            <Upload
                maxCount={1}
                beforeUpload={handleImportAsset}
                showUploadList={false}
            >
                <Button>{t('assets.import')}</Button>
            </Upload>
        </Popover>,
        <Button key="export" onClick={downloadAssets}>{t('actions.export')}</Button>,
    ].filter(Boolean);

    const batchActions = selectedRowKeys.length > 0 && (
        <div
            className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 py-3 dark:border-gray-800">
            <span className="text-sm text-gray-500">
                {t('identity.oidc_client.selected_count', {count: selectedRowKeys.length})}
            </span>
            <Space size={16} wrap>
                <NButton
                    onClick={() => {
                        setBatchEditorOpen(true);
                    }}
                >
                    {t('assets.batch_edit.title')}
                </NButton>
                <NButton
                    onClick={() => {
                        setGroupChooserOpen(true);
                    }}
                >
                    {t('assets.change_group')}
                </NButton>
                <NButton
                    onClick={() => {
                        testingMutation.mutate(selectedRowKeys);
                    }}
                >
                    {t('assets.conn_test')}
                </NButton>
                <NButton
                    onClick={() => {
                        setRotateOpen(true);
                    }}
                >
                    {t('assets.rotation.rotate')}
                </NButton>
                <NButton
                    danger={true}
                    onClick={async () => {
                        modal.confirm({
                            title: t('general.confirm_delete'),
                            onOk: async () => {
                                await api.deleteById(selectedRowKeys.join(','));
                                setSelectedRowKeys([]);
                                assetPagingQuery.refetch();
                            }
                        })
                    }}
                >{t('actions.delete')}
                </NButton>
            </Space>
        </div>
    );

    const renderTable = (scroll?: TableProps<Asset>['scroll']) => {
        return (
            <div className="overflow-hidden rounded-md bg-white dark:bg-[#141414]">
                <div className={cn(
                    'flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 dark:border-gray-800',
                    isMobile && 'items-stretch'
                )}>
                    <div className="font-medium">{t('menus.resource.submenus.asset')}</div>
                    <Space wrap className={cn(isMobile && 'w-full [&_.ant-space-item]:w-full')}>
                        <Input.Search
                            allowClear
                            placeholder={t('general.search_placeholder')}
                            onSearch={(value) => {
                                setKeyword(value.trim());
                                resetTableToFirstPage();
                            }}
                            style={{width: isMobile ? '100%' : 240}}
                        />
                        {statusFilter}
                        <Space wrap className={cn(isMobile && 'w-full')}>
                            {toolbarActions}
                        </Space>
                    </Space>
                </div>
                {batchActions}
                <DraggableTable<Asset>
                    columns={columns}
                    dataSource={dataSource}
                    loading={assetPagingQuery.isFetching}
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
                    size={'small'}
                />
            </div>
        );
    };

    const tagFilter = tags.length === 0 ? null : (
        <div className={cn('flex items-center flex-wrap pb-0', isMobile && 'gap-y-1')}>
            <span className={cn('font-medium', isMobile && 'w-full text-sm')}>{t('assets.tags')}：</span>
            <Tag.CheckableTag
                checked={selectedTags.length === 0}
                onChange={() => handleTagChange([])}
            >
                {t('general.all')}
            </Tag.CheckableTag>
            {tags.map((tag) => (
                <Tag.CheckableTag
                    key={tag}
                    checked={selectedTags.includes(tag)}
                    onChange={(checked) => {
                        handleTagChange(
                            checked ? [...selectedTags, tag] : selectedTags.filter(t => t !== tag)
                        );
                    }}
                >
                    {tag}
                </Tag.CheckableTag>
            ))}
        </div>
    );

    const treeCollapseTitle = isTreeCollapsed ? t('assets.expand_group_tree') : t('assets.collapse_group_tree');

    return (<div>
        <div>
            {isMobile ? (
                <div className="space-y-3">
                    <div className="max-h-[38vh] overflow-auto rounded-md bg-white dark:bg-gray-800">
                        <AssetTree selected={groupId} onSelect={handleGroupChange}/>
                    </div>
                    {tagFilter}
                    {renderTable({x: 760})}
                </div>
            ) : (
                <div className={cn(
                    "grid gap-4 transition-all duration-300",
                    isTreeCollapsed ? "grid-cols-[48px_1fr]" : "grid-cols-[var(--group-tree-width)_1fr]"
                )} style={{
                    '--group-tree-width': `${treeWidth}px`,
                } as CSSProperties}>
                    <div className="relative flex min-h-60 flex-col rounded-md bg-gray-50 dark:bg-[#141414]">
                        {!isTreeCollapsed && (
                            <div className="flex-1">
                                <AssetTree selected={groupId} onSelect={handleGroupChange}/>
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
                        {!isTreeCollapsed && (
                            <div
                                aria-label={t('assets.group')}
                                className="absolute -right-2 top-0 h-full w-4 cursor-col-resize select-none"
                                onMouseDown={event => {
                                    event.preventDefault();
                                    setTreeResizeStart({x: event.clientX, width: treeWidth});
                                }}
                            />
                        )}
                    </div>
                    <div className="overflow-hidden">
                        {tagFilter}
                        {renderTable({x: 'max-content'})}
                    </div>
                </div>
            )}
        </div>

        <AssetTreeChoose
            assetIds={selectedRowKeys}
            open={groupChooserOpen}
            onClose={() => {
                setGroupChooserOpen(false);
                setSelectedRowKeys([]);
                assetPagingQuery.refetch();
            }}
        />

        <AssetBatchEditDrawer
            assetIds={selectedRowKeys}
            open={batchEditorOpen}
            onClose={() => setBatchEditorOpen(false)}
            onSuccess={() => {
                setBatchEditorOpen(false);
                setSelectedRowKeys([]);
                assetPagingQuery.refetch();
            }}
        />

        <AssetPostDrawer
            open={params.open}
            onClose={() => {
                setParams({
                    open: false,
                    assetId: undefined,
                    groupId: undefined,
                    copy: false,
                })
            }}
            onSuccess={() => assetPagingQuery.refetch()}
            assetId={params.assetId}
            groupId={params.groupId}
            copy={params.copy}
        />
        <MultiFactorAuthentication
            open={rdpMfaOpen}
            handleOk={(securityToken) => {
                setRdpMfaOpen(false);
                createRdpProxyTicketMutation.mutate({assetId: pendingRdpAssetId, securityToken});
            }}
            handleCancel={() => {
                setRdpMfaOpen(false);
                setPendingRdpAssetId('');
            }}
        />

        <AssetRotateModal
            open={rotateOpen}
            handleCancel={() => setRotateOpen(false)}
            assetIds={selectedRowKeys}
            onSuccess={(results) => {
                setRotationResults(results);
                setSelectedRowKeys([]);
            }}
        />

        <RotationResultModal
            open={rotationResults.length > 0}
            handleCancel={() => setRotationResults([])}
            results={rotationResults}
        />
    </div>);
}

export default AssetPage;
