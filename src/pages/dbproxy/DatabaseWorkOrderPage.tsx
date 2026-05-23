import React, {useState} from 'react';
import {
    App,
    Button,
    Input,
    Modal,
    Popconfirm,
    Select,
    Space,
    Table,
    type TableProps,
    Tag,
    Tooltip,
    Typography} from "antd";
import {useTranslation} from "react-i18next";
import {useMutation, useQuery} from "@tanstack/react-query";
import {DatabaseWorkOrder, dbWorkOrderAdminApi} from "@/api/db-work-order-api";
import NButton from "@/components/NButton";
import {getSort} from "@/utils/sort";
import {UserSelect} from "@/components/shared/QuerySelects";
import portalApi from "@/api/portal-api";
import dayjs from "dayjs";

const {Text} = Typography;

const DatabaseWorkOrderPage = () => {
    const {t} = useTranslation();
    const {modal, message} = App.useApp();

    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectId, setRejectId] = useState<string | undefined>(undefined);
    const [pagination, setPagination] = useState({current: 1, pageSize: 10});
    const [sort, setSort] = useState<Record<string, string | null>>({});
    const [status, setStatus] = useState<string>();
    const [assetId, setAssetId] = useState<string>();
    const [requesterId, setRequesterId] = useState<string>();

    const databaseAssetsQuery = useQuery({
        queryKey: ['portal-database-assets'],
        queryFn: () => portalApi.databaseAssets(),
        refetchOnWindowFocus: false,
    });

    const workOrderPagingQuery = useQuery({
        queryKey: ['admin-db-work-orders', pagination.current, pagination.pageSize, sort, status, assetId, requesterId],
        queryFn: async () => {
            const [sortOrder, sortField] = getSort(sort);
            const queryParams = {
                pageIndex: pagination.current,
                pageSize: pagination.pageSize,
                sortOrder: sortOrder,
                sortField: sortField,
                status: status || undefined,
                assetId: assetId || undefined,
                requesterId: requesterId || undefined,
            };
            return dbWorkOrderAdminApi.paging(queryParams);
        },
        refetchOnWindowFocus: false,
    });

    const reloadTable = () => {
        workOrderPagingQuery.refetch();
    };

    const resetTableToFirstPage = () => {
        setPagination((prev) => ({...prev, current: 1}));
    };

    const approveMutation = useMutation({
        mutationFn: (id: string) => dbWorkOrderAdminApi.approve(id),
        onSuccess: () => {
            reloadTable();
            message.success(t('general.success'));
        }
    });

    const rejectMutation = useMutation({
        mutationFn: (payload: { id: string, reason: string }) => dbWorkOrderAdminApi.reject(payload.id, payload.reason),
        onSuccess: () => {
            reloadTable();
            setRejectOpen(false);
            setRejectReason('');
            setRejectId(undefined);
            message.success(t('general.success'));
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => dbWorkOrderAdminApi.deleteById(id),
        onSuccess: () => {
            reloadTable();
            message.success(t('general.success'));
        }
    });

    const statusTag = (status: string, message?: string) => {
        const map: Record<string, { color: string; label: string }> = {
            pending: {color: 'processing', label: t('db.work_order.status.pending')},
            approved: {color: 'blue', label: t('db.work_order.status.approved')},
            rejected: {color: 'red', label: t('db.work_order.status.rejected')},
            executed: {color: 'green', label: t('db.work_order.status.executed')},
            failed: {color: 'red', label: t('db.work_order.status.failed')},
        };
        const item = map[status] || {color: 'default', label: status};
        if ((status === 'failed' || status === 'rejected') && message) {
            return (
                <Tooltip title={message}>
                    <Tag color={item.color}>{item.label}</Tag>
                </Tooltip>
            );
        }
        return <Tag color={item.color}>{item.label}</Tag>;
    };

    const handleTableChange: TableProps<DatabaseWorkOrder>['onChange'] = (nextPagination, filters, sorter) => {
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

    const statusOptions = [
        {value: 'pending', label: t('db.work_order.status.pending')},
        {value: 'approved', label: t('db.work_order.status.approved')},
        {value: 'rejected', label: t('db.work_order.status.rejected')},
        {value: 'executed', label: t('db.work_order.status.executed')},
        {value: 'failed', label: t('db.work_order.status.failed')},
    ];

    const columns: TableProps<DatabaseWorkOrder>['columns'] = [
        {
            title: t('menus.resource.submenus.database_asset'),
            dataIndex: 'assetName',
            ellipsis: true,
            fixed: 'left',
        },
        {
            title: t('db.asset.database'),
            dataIndex: 'database',
            ellipsis: true,
        },
        {
            title: t('db.sql_log.sql'),
            dataIndex: 'sql',
            render: (text) => {
                if (!text) {
                    return '-';
                }
                return (
                    <Tooltip title={text} placement="topLeft">
                        <Text ellipsis style={{maxWidth: 260}}>{text}</Text>
                    </Tooltip>
                );
            },
        },
        {
            title: t('db.work_order.reason'),
            dataIndex: 'requestReason',
            render: (text) => {
                if (!text) {
                    return '-';
                }
                return (
                    <Tooltip title={text} placement="topLeft">
                        <Text ellipsis style={{maxWidth: 220}}>{text}</Text>
                    </Tooltip>
                );
            },
        },
        {
            title: t('db.work_order.requester'),
            dataIndex: 'requesterName',
            render: (text) => text || '-',
        },
        {
            title: t('general.status'),
            dataIndex: 'status',
            render: (_, record) => statusTag(record.status, record.errorMessage || record.reason),
            width: 120,
        },
        {
            title: t('db.sql_log.rows_affected'),
            dataIndex: 'rowsAffected',
            width: 120,
        },
        {
            title: t('db.work_order.approver'),
            dataIndex: 'approverName',
            width: 120,
        },
        {
            title: t('general.created_at'),
            dataIndex: 'createdAt',
            sorter: true,
            width: 180,
            render: (value: number) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-',
        },
        {
            title: t('sysops.logs.exec_at'),
            dataIndex: 'executedAt',
            width: 180,
            render: (value: number) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-',
        },
        {
            title: t('actions.label'),
            key: 'option',
            width: 160,
            fixed: 'right',
            render: (_text, record) => {
                const actions = [] as React.ReactNode[];
                if (record.status === 'pending') {
                    actions.push(
                        <NButton key="approve" onClick={() => {
                            modal.confirm({
                                title: t('db.work_order.approve_confirm'),
                                onOk: async () => approveMutation.mutate(record.id),
                            });
                        }}>
                            {t('db.work_order.approve')}
                        </NButton>
                    );
                    actions.push(
                        <NButton key="reject" danger onClick={() => {
                            setRejectOpen(true);
                            setRejectId(record.id);
                        }}>
                            {t('identity.policy.action.reject')}
                        </NButton>
                    );
                }
                if (record.status !== 'approved') {
                    actions.push(
                        <Popconfirm
                            key="delete-confirm"
                            title={t('general.confirm_delete')}
                            onConfirm={() => deleteMutation.mutate(record.id)}
                        >
                            <NButton key="delete" danger>
                                {t('actions.delete')}
                            </NButton>
                        </Popconfirm>
                    );
                }
                return <Space size={8}>{actions}</Space>;
            },
        },
    ];

    return (
        <div>
            <div className="overflow-hidden rounded-md bg-white dark:bg-[#141414]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
                    <div className="font-medium">{t('menus.resource.submenus.db_work_order')}</div>
                    <Space wrap>
                        <Select
                            allowClear
                            showSearch
                            placeholder={t('menus.resource.submenus.database_asset')}
                            loading={databaseAssetsQuery.isLoading}
                            value={assetId}
                            style={{width: 220}}
                            options={(databaseAssetsQuery.data || []).map(item => ({
                                label: item.name,
                                value: item.id,
                            }))}
                            filterOption={(input, option) =>
                                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                            }
                            onChange={(value) => {
                                setAssetId(value);
                                resetTableToFirstPage();
                            }}
                        />
                        <UserSelect
                            value={requesterId}
                            onChange={(value) => {
                                setRequesterId(value);
                                resetTableToFirstPage();
                            }}
                        />
                        <Select
                            allowClear
                            placeholder={t('general.status')}
                            value={status}
                            style={{width: 160}}
                            options={statusOptions}
                            onChange={(value) => {
                                setStatus(value);
                                resetTableToFirstPage();
                            }}
                        />
                        <Button loading={workOrderPagingQuery.isFetching} onClick={reloadTable}>
                            {t('actions.refresh')}
                        </Button>
                    </Space>
                </div>
                <Table<DatabaseWorkOrder>
                    columns={columns}
                    dataSource={workOrderPagingQuery.data?.items || []}
                    loading={workOrderPagingQuery.isFetching}
                    rowKey="id"
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total: workOrderPagingQuery.data?.total || 0,
                        showSizeChanger: true
                    }}
                    onChange={handleTableChange}
                    scroll={{
                        x: 'max-content',
                    }}
                    size="small"
                />
            </div>

            <Modal
                title={t('identity.policy.action.reject')}
                open={rejectOpen}
                onOk={() => {
                    if (!rejectId) {
                        return;
                    }
                    if (!rejectReason.trim()) {
                        message.error(t('db.work_order.reject_reason'));
                        return;
                    }
                    rejectMutation.mutate({id: rejectId, reason: rejectReason});
                }}
                onCancel={() => {
                    setRejectOpen(false);
                    setRejectReason('');
                    setRejectId(undefined);
                }}
                confirmLoading={rejectMutation.isPending}
            >
                <Input.TextArea
                    rows={4}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder={t('db.work_order.reject_reason')}
                />
            </Modal>
        </div>
    );
};

export default DatabaseWorkOrderPage;
