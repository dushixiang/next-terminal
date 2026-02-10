import React, {useMemo, useRef, useState} from 'react';
import {App, Button, Tag, Tooltip, Typography} from "antd";
import {ActionType, ProColumns, ProTable} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {useMutation} from "@tanstack/react-query";
import {DatabaseWorkOrder, dbWorkOrderApi} from "@/api/db-work-order-api";
import DatabaseWorkOrderModal from "@/pages/facade/DatabaseWorkOrderModal.tsx";
import {getSort} from "@/utils/sort";
import {useMobile} from "@/hook/use-mobile";
import {cn} from "@/lib/utils";
import {debounce} from "@/utils/debounce";
import FacadeSearchBar from "@/pages/facade/components/FacadeSearchBar";

const {Text} = Typography;

const DatabaseWorkOrderUserPage = () => {
    const {t} = useTranslation();
    const {isMobile} = useMobile();
    const {message} = App.useApp();
    const actionRef = useRef<ActionType>(null);
    const [open, setOpen] = useState(false);
    const [keyword, setKeyword] = useState<string>('');

    const reloadTable = useMemo(() => debounce(() => {
        actionRef.current?.reload();
    }, 300), []);

    const createMutation = useMutation({
        mutationFn: dbWorkOrderApi.create,
        onSuccess: () => {
            actionRef.current?.reload();
            setOpen(false);
            message.success(t('general.success'));
        }
    });

    const statusTag = (status: string, error?: string) => {
        const map: Record<string, { color: string; label: string }> = {
            pending: {color: 'processing', label: t('db.work_order.status.pending')},
            approved: {color: 'blue', label: t('db.work_order.status.approved')},
            rejected: {color: 'red', label: t('db.work_order.status.rejected')},
            executed: {color: 'green', label: t('db.work_order.status.executed')},
            failed: {color: 'red', label: t('db.work_order.status.failed')},
        };
        const item = map[status] || {color: 'default', label: status};
        if ((status === 'failed' || status === 'rejected') && error) {
            return (
                <Tooltip title={error}>
                    <Tag color={item.color}>{item.label}</Tag>
                </Tooltip>
            );
        }
        return <Tag color={item.color}>{item.label}</Tag>;
    };

    const columns: ProColumns<DatabaseWorkOrder>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
            hideInTable: isMobile,
        },
        {
            title: t('menus.resource.submenus.database_asset'),
            dataIndex: 'assetName',
            hideInSearch: true,
            ellipsis: true,
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
            hideInTable: isMobile,
        },
        {
            title: t('sysops.logs.exec_at'),
            dataIndex: 'executedAt',
            valueType: 'dateTime',
            hideInSearch: true,
            width: 180,
            hideInTable: isMobile,
        },
    ];

    return (
        <div className={cn('px-4 lg:px-20', isMobile && 'px-2')}>
            <div className={cn('py-6', isMobile && 'p-4')}>
                <div className={'rounded-2xl border border-slate-200/70 dark:border-slate-700/70 p-4 lg:p-5'}>
                    <div className={'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3'}>
                        <div className={'flex flex-col gap-1'}>
                            <div className={'text-xl font-bold text-slate-900 dark:text-slate-100'}>
                                {t('menus.resource.submenus.db_work_order')}
                            </div>
                        </div>
                    </div>
                    <div className={'pt-3'}>
                        <FacadeSearchBar
                            value={keyword}
                            onChange={(value) => {
                                setKeyword(value);
                                reloadTable();
                            }}
                        />
                    </div>
                </div>
            </div>
            <div className={'rounded-xl ring-1 ring-slate-200/60 dark:ring-slate-700/60 p-1'}>
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
                            keyword: keyword.trim() || undefined,
                        };
                        const result = await dbWorkOrderApi.paging(queryParams);
                        return {
                            data: result['items'],
                            success: true,
                            total: result['total']
                        };
                    }}
                    rowKey="id"
                    search={false}
                    pagination={{
                        defaultPageSize: 10,
                        showSizeChanger: !isMobile,
                        simple: isMobile,
                    }}
                    scroll={{
                        x: 'max-content',
                    }}
                    dateFormatter="string"
                    headerTitle={null}
                    toolBarRender={() => [
                        <Button
                            key="button"
                            type="primary"
                            size={isMobile ? 'middle' : 'middle'}
                            onClick={() => setOpen(true)}
                        >
                            {t('db.work_order.new')}
                        </Button>,
                    ]}
                    options={{
                        density: !isMobile,
                        fullScreen: !isMobile,
                        reload: true,
                        setting: !isMobile,
                    }}
                />
            </div>

            <DatabaseWorkOrderModal
                open={open}
                confirmLoading={createMutation.isPending}
                handleCancel={() => setOpen(false)}
                handleOk={createMutation.mutate}
            />
        </div>
    );
};

export default DatabaseWorkOrderUserPage;
