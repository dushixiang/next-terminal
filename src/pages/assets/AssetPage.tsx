import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {App, Badge, Button, Popover, Select, Space, Table, Tag, Tooltip, Upload} from "antd";
import {useNavigate, useSearchParams} from "react-router-dom";
import {ActionType, DragSortTable, ProColumns, TableDropdown} from "@ant-design/pro-components";
import {useMutation, useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import assetsApi, {Asset, SortPositionRequest} from '@/api/asset-api';
import NButton from "@/components/NButton";
import AssetTree from "@/pages/assets/AssetTree";
import {accessAsset} from "@/helper/access-tab-channel";
import clsx from "clsx";
import {getImgColor, getProtocolColor} from "@/helper/asset-helper";
import AssetTreeChoose from "@/pages/assets/AssetTreeChoose";
import {browserDownload, openOrSwitchToPage} from "@/utils/utils";
import {useMobile} from "@/hook/use-mobile";
import {cn} from "@/lib/utils";
import {PanelLeftCloseIcon, PanelLeftOpenIcon} from "lucide-react";
import {safeEncode} from "@/utils/codec";
import AssetPostDrawer from "@/pages/assets/AssetPostDrawer";
import {baseUrl} from "@/api/core/requests";
import {getSort} from "@/utils/sort";

const api = assetsApi;

function downloadImportExampleCsv() {
    browserDownload(`${baseUrl()}/admin/assets/sample`)
}

interface PostParams {
    open: boolean;
    assetId?: string;
    groupId?: string;
    copy?: boolean;
}

const AssetPage = () => {

    const {isMobile} = useMobile();
    const actionRef = useRef<ActionType>(null);
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
    let [dataSource, setDataSource] = useState<Asset[]>([]);

    let [groupChooserOpen, setGroupChooserOpen] = useState(false);
    let [params, setParams] = useState<PostParams>({
        open: false,
        assetId: undefined,
        groupId: undefined,
        copy: false,
    });

    let navigate = useNavigate();
    let {t} = useTranslation();
    let {modal, message} = App.useApp();

    const [isTreeCollapsed, setIsTreeCollapsed] = useState<boolean>(false);

    const assetIdFromUrl = queryState.assetId;

    useEffect(() => {
        if (assetIdFromUrl) {
            setParams(prev => {
                if (prev.open && prev.assetId === assetIdFromUrl) {
                    return prev;
                }
                return {
                    open: true,
                    assetId: assetIdFromUrl,
                    groupId: prev.groupId,
                    copy: false,
                };
            });
        }
    }, [assetIdFromUrl]);

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

    let tagsQuery = useQuery({
        queryKey: ['tags'],
        queryFn: assetsApi.getTags,
        refetchOnWindowFocus: false,
    });

    let testingMutation = useMutation({
        mutationFn: assetsApi.checking,
        onSuccess: () => {
            actionRef.current?.reload();
        }
    });

    const updateSortMutation = useMutation({
        mutationFn: (req: SortPositionRequest) => assetsApi.updateSortPosition(req),
        onSuccess: () => {
            message.success(t('general.success'));
        }
    });

    const handleDragSortEnd = (beforeIndex: number, afterIndex: number, newDataSource: Asset[]) => {
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

        console.log('排序请求', req);

        // 服务器更新
        updateSortMutation.mutate(req);
    };

    const importExampleContent = <>
        <NButton onClick={downloadImportExampleCsv}>{t('assets.download_sample')}</NButton>
        <div>{t('assets.import_asset_tip')}</div>
    </>

    const openAssetEditor = (assetId: string, options?: Partial<PostParams>) => {
        setParams({
            open: true,
            assetId,
            groupId: options?.groupId,
            copy: options?.copy ?? false,
        });
        applyQueryPatch({assetId});
    };

    const columns: ProColumns<Asset>[] = [
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
                        className={clsx(`w-6 h-6 rounded flex items-center justify-center font-bold text-white text-xs`, getImgColor(record.protocol))}>
                        {record.name[0]}
                    </div>
                }
                return <img src={record.logo} alt={record['name']} className={'w-6 h-6'}/>;
            }
        },
        {
            title: t('assets.name'),
            dataIndex: 'name',
            sorter: true,
            width: isMobile ? 120 : 200,
            render: (text, record) => {
                const handleOpen = () => openAssetEditor(record.id, {groupId: record.groupId});
                return <div className={'flex flex-col'}>
                    <span
                        className={'cursor-pointer text-blue-600 hover:underline'}
                        onClick={handleOpen}
                    >
                        {text}
                    </span>
                    {!isMobile && (
                        <Tooltip title={record.description}>
                            <div className={'text-gray-500 line-clamp-1'}>{record.description}</div>
                        </Tooltip>
                    )}
                </div>
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
                                setGroupChooserOpen(true);
                                setSelectedRowKeys([record.id]);
                            }}
                >
                    {text}
                </div>
            },
            hideInSearch: true,
        },
        {
            title: t('assets.protocol'),
            dataIndex: 'protocol',
            key: 'protocol',
            sorter: true,
            width: isMobile ? 60 : 80,
            render: (text, record) => {
                return <span
                    className={clsx('rounded-md px-1.5 py-1 text-white font-bold', getProtocolColor(record.protocol))}
                    style={{fontSize: isMobile ? 8 : 9}}>
                        {record.protocol.toUpperCase()}
                    </span>
            },
            renderFormItem: (item, {type, defaultRender, ...rest}, form) => {
                if (type === 'form') {
                    return null;
                }

                return (
                    <Select>
                        <Select.Option value="rdp">RDP</Select.Option>
                        <Select.Option value="ssh">SSH</Select.Option>
                        <Select.Option value="telnet">Telnet</Select.Option>
                        <Select.Option value="vnc">VNC</Select.Option>
                        {/*<Select.Option value="kubernetes">Kubernetes</Select.Option>*/}
                    </Select>
                );
            },
        },
        {
            title: t('assets.network'),
            dataIndex: 'network',
            key: 'network',
            width: isMobile ? 90 : 160,
            hideInTable: isMobile, // 移动端隐藏网络列
            render: (text, record) => {
                return `${record['ip'] + ':' + record['port']}`;
            }
        },
        {
            title: t('assets.tags'),
            dataIndex: 'tags',
            key: 'tags',
            width: isMobile ? 80 : 120,
            hideInTable: isMobile, // 移动端隐藏标签列
            render: tags => {
                if (tags == '-') {
                    return undefined;
                }
                if (tags) {
                    let items = tags as string[];
                    return items?.map(tag => <Tag key={tag}>{tag}</Tag>);
                }
            },
            renderFormItem: (item, {type, defaultRender, ...rest}, form) => {
                if (type === 'form') {
                    return null;
                }

                return (
                    <Select mode="multiple"
                            allowClear>
                        {
                            tagsQuery.data?.map(tag => {
                                if (tag === '-') {
                                    return undefined;
                                }
                                return <Select.Option key={tag}>{tag}</Select.Option>
                            })
                        }
                    </Select>
                );
            },
        },
        {
            title: t('assets.status'),
            dataIndex: 'status',
            key: 'status',
            sorter: true,
            width: isMobile ? 70 : 100,
            render: (status, record) => {
                switch (status) {
                    case 'testing':
                        return (
                            <Badge status="processing" text={t('assets.testing')}/>
                        )
                    case 'active':
                        return (
                            <Badge status="success" text={t('assets.active')}/>
                        )
                    case 'inactive':
                        return (
                            <Tooltip title={record.statusText}>
                                <Badge status="error" text={t('assets.inactive')}/>
                            </Tooltip>
                        )
                }
            },
            renderFormItem: (item, {type, defaultRender, ...rest}, form) => {
                if (type === 'form') {
                    return null;
                }

                return (
                    <Select>
                        <Select.Option value="active">{t('assets.active')}</Select.Option>
                        <Select.Option value="inactive">{t('assets.inactive')}</Select.Option>
                    </Select>
                );
            },
        },
        {
            title: t('actions.option'),
            valueType: 'option',
            key: 'option',
            width: isMobile ? 80 : 120,
            render: (text, record, index, action) => {
                const id = record['id'];
                return [
                    <NButton
                        key={`btn-access-${id}`}
                        onClick={() => {
                            let msg = {
                                id: id,
                                name: record['name'],
                                protocol: record['protocol'],
                            }
                            const url = `/access?asset=${safeEncode(msg)}`;
                            openOrSwitchToPage(url, 'NT_Access');
                            accessAsset(msg);
                        }}
                    >
                        {isMobile ? t('assets.access').substring(0, 2) : t('assets.access')}
                    </NButton>,
                    <TableDropdown
                        key={`perm-action-${id}`}
                        onSelect={(key) => {
                            switch (key) {
                                case "copy":
                                    openAssetEditor(record.id, {groupId: record.groupId, copy: true});
                                    break;
                                case "edit":
                                    openAssetEditor(record.id, {groupId: record.groupId});
                                    break;
                                case 'view-authorised-asset':
                                    navigate(`/authorised-asset?assetId=${record['id']}`);
                                    break;
                                case 'delete':
                                    modal.confirm({
                                        title: t('general.delete_confirm'),
                                        okText: t('actions.delete'),
                                        onOk: async () => {
                                            if (queryState.assetId === record.id) {
                                                applyQueryPatch({assetId: undefined});
                                                setParams({
                                                    open: false,
                                                    assetId: undefined,
                                                    groupId: undefined,
                                                    copy: false,
                                                });
                                            }
                                            await api.deleteById(record.id);
                                            actionRef.current?.reload();
                                        },
                                    })
                            }
                        }}
                        menus={[
                            {key: 'copy', name: t('assets.copy')},
                            {key: 'edit', name: t('actions.edit')},
                            {
                                key: 'view-authorised-asset',
                                name: `${t('authorised.label.authorised')}${t('authorised.label.user')}`
                            },
                            {key: 'delete', name: t('actions.delete'), danger: true},
                        ]}
                    />,
                ]
            },
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
        actionRef.current?.reload();
        return false;
    }

    // 统一的 ProTable 配置
    const tableProps = {
        columns,
        actionRef,
        request: async (params: any = {}, sort: any, filter: any) => {
            let ip: string, port: string;
            if (params.network) {
                let split = params.network.split(':');
                if (split.length >= 2) {
                    ip = split[0];
                    port = split[1];
                } else {
                    ip = split[0];
                }
            }

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
                type: params.type,
                protocol: params.protocol,
                active: params.active,
                tags: params.tags?.join(','),
                ip: ip,
                port: port,
                groupId: groupId,
                status: params.status,
            }
            let result = await api.getPaging(queryParams);
            setDataSource(result['items']);
            return {
                data: result.items,
                success: true,
                total: result['total']
            };
        },
        dataSource: dataSource,
        dragSortKey: "sort",
        onDragSortEnd: handleDragSortEnd,
        columnsState: {
            persistenceKey: 'assets-table',
            persistenceType: 'localStorage' as const,
        },
        rowSelection: {
            selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT],
        },
        tableAlertOptionRender: ({selectedRowKeys}: any) => {
            return (
                <Space size={16}>
                    <NButton
                        onClick={() => {
                            setSelectedRowKeys(selectedRowKeys as string[]);
                            setGroupChooserOpen(true);
                        }}
                    >
                        {t('assets.change_group')}
                    </NButton>
                    <NButton
                        onClick={() => {
                            testingMutation.mutate(selectedRowKeys as string[]);
                        }}
                    >
                        {t('assets.conn_test')}
                    </NButton>
                    <NButton
                        danger={true}
                        onClick={async () => {
                            modal.confirm({
                                title: t('general.delete_confirm'),
                                onOk: async () => {
                                    await api.deleteById(selectedRowKeys.join(','));
                                    actionRef.current?.reload();
                                }
                            })
                        }}
                    >{t('actions.delete')}
                    </NButton>
                </Space>
            );
        },
        rowKey: "id" as const,
        pagination: {
            defaultPageSize: 10,
            showSizeChanger: !isMobile // 移动端隐藏页面大小选择器
        },
        dateFormatter: "string" as const,
        headerTitle: t('menus.resource.submenus.asset'),
        toolBarRender: () => {
            return [
                <Button
                    key="auth"
                    onClick={() => {
                        navigate('/authorised-asset');
                    }}
                    color={'purple'}
                    variant={'dashed'}
                >
                    {t('authorised.label.authorised')}
                </Button>,
                groupId && (
                    <Button
                        key="group-auth"
                        onClick={() => navigate(`/authorised-asset?assetGroupId=${groupId}`)}
                    >
                        {`${t('authorised.label.asset_group')}${t('authorised.label.authorised')}`}
                    </Button>
                ),
                <Button key="add"
                        type="primary"
                        onClick={() => {
                            applyQueryPatch({assetId: undefined});
                            setParams({
                                open: true,
                                assetId: undefined,
                                groupId: groupId,
                                copy: false,
                            })
                        }}
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
            ];
        }
    };

    return (<div>
        <div className={cn('px-4', isMobile && 'px-2')}>
            {/* 移动端网站树 - 在表格上方显示 */}
            {isMobile && (
                <>
                    <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg">
                        <AssetTree
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
                            <AssetTree
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

        <AssetTreeChoose
            assetIds={selectedRowKeys}
            open={groupChooserOpen}
            onClose={() => {
                setGroupChooserOpen(false);
                setSelectedRowKeys([]);
                actionRef.current?.reload();
            }}
        />

        <AssetPostDrawer
            open={params.open}
            onClose={() => {
                applyQueryPatch({assetId: undefined});
                setParams({
                    open: false,
                    assetId: undefined,
                    groupId: undefined,
                    copy: false,
                })
                actionRef.current?.reload();
            }}
            assetId={params.assetId}
            groupId={params.groupId}
            copy={params.copy}
        />
    </div>);
}

export default AssetPage;
