import React, {useRef, useState} from 'react';
import {App, Input, Modal, Popconfirm, Select, Tag, Tooltip, Typography} from "antd";
import {ActionType, ProColumns, ProTable} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {useMutation, useQuery} from "@tanstack/react-query";
import {DatabaseWorkOrder, dbWorkOrderAdminApi} from "@/api/db-work-order-api";
import NButton from "@/components/NButton";
import {getSort} from "@/utils/sort";
import {UserSelect} from "@/components/shared/QuerySelects";
import portalApi from "@/api/portal-api";

const {Text} = Typography;

const DatabaseWorkOrderPage = () => {
    const {t} = useTranslation();
    const actionRef = useRef<ActionType>(null);
    const {modal, message} = App.useApp();

    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectId, setRejectId] = useState<string | undefined>(undefined);

    const databaseAssetsQuery = useQuery({
        queryKey: ['portal-database-assets'],
        queryFn: () => portalApi.databaseAssets(),
        refetchOnWindowFocus: false,
    });

    const approveMutation = useMutation({
        mutationFn: (id: string) => dbWorkOrderAdminApi.approve(id),
        onSuccess: () => {
            actionRef.current?.reload();
            message.success(t('general.success'));
        }
    });

    const rejectMutation = useMutation({
        mutationFn: (payload: { id: string, reason: string }) => dbWorkOrderAdminApi.reject(payload.id, payload.reason),
        onSuccess: () => {
            actionRef.current?.reload();
            setRejectOpen(false);
            setRejectReason('');
            setRejectId(undefined);
            message.success(t('general.success'));
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => dbWorkOrderAdminApi.deleteById(id),
        onSuccess: () => {
            actionRef.current?.reload();
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

    const columns: ProColumns<DatabaseWorkOrder>[] = [
        {
            title: t('menus.resource.submenus.database_asset'),
            dataIndex: 'assetName',
            formItemProps: {
                name: 'assetId',
            },
            renderFormItem: (_, {type, ...rest}) => {
                if (type === 'form') {
                    return null;
                }
                return (
                    <Select
                        allowClear
                        showSearch
                        placeholder={t('menus.resource.submenus.database_asset')}
                        loading={databaseAssetsQuery.isLoading}
                        options={(databaseAssetsQuery.data || []).map(item => ({
                            label: item.name,
                            value: item.id,
                        }))}
                        filterOption={(input, option) =>
                            (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                        }
                        {...rest}
                    />
                );
            },
            ellipsis: true,
            fixed: 'left'
        },
        {
            title: t('db.asset.database'),
            dataIndex: 'database',
            hideInSearch: true,
            ellipsis: true,
        },
        {
            title: t('db.sql_log.sql'),
            dataIndex: 'sql',
            hideInSearch: true,
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
            hideInSearch: true,
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
            formItemProps: {
                name: 'requesterId',
            },
            renderFormItem: (_, {type, ...rest}) => {
                if (type === 'form') {
                    return null;
                }
                return <UserSelect {...rest} />;
            },
            render: (text) => text || '-',
        },
        {
            title: t('general.status'),
            dataIndex: 'status',
            valueEnum: {
                pending: {text: t('db.work_order.status.pending')},
                approved: {text: t('db.work_order.status.approved')},
                rejected: {text: t('db.work_order.status.rejected')},
                executed: {text: t('db.work_order.status.executed')},
                failed: {text: t('db.work_order.status.failed')},
            },
            render: (_, record) => statusTag(record.status, record.errorMessage || record.reason),
            width: 120,
        },
        {
            title: t('db.sql_log.rows_affected'),
            dataIndex: 'rowsAffected',
            hideInSearch: true,
            width: 120,
        },
        {
            title: t('db.work_order.approver'),
            dataIndex: 'approverName',
            hideInSearch: true,
            width: 120,
        },
        {
            title: t('general.created_at'),
            dataIndex: 'createdAt',
            valueType: 'dateTime',
            hideInSearch: true,
            sorter: true,
            width: 180,
        },
        {
            title: t('sysops.logs.exec_at'),
            dataIndex: 'executedAt',
            valueType: 'dateTime',
            hideInSearch: true,
            width: 180,
        },
        {
            title: t('actions.label'),
            valueType: 'option',
            key: 'option',
            width: 160,
            fixed: 'right',
            render: (text, record) => {
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
                return actions;
            },
        },
    ];

    return (
        <div>
            <ProTable
                columns={columns}
                actionRef={actionRef}
                request={async (params = {}, sort) => {
                    const [sortOrder, sortField] = getSort(sort);
                    const queryParams = {
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        sortOrder: sortOrder,
                        sortField: sortField,
                        status: params.status,
                        assetId: params.assetId,
                        requesterId: params.requesterId,
                    };
                    const result = await dbWorkOrderAdminApi.paging(queryParams);
                    return {
                        data: result['items'],
                        success: true,
                        total: result['total']
                    };
                }}
                rowKey="id"
                search={{
                    labelWidth: 'auto',
                }}
                pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true
                }}
                scroll={{
                    x: 'max-content',
                }}
                dateFormatter="string"
                headerTitle={t('menus.resource.submenus.db_work_order')}
            />

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
