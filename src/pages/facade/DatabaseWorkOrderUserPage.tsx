import Disabled from "@/components/Disabled";
import {useLicense} from "@/hook/LicenseContext";
import {useRef, useState} from 'react';
import {
    App,
    Button,
    Tag,
    Tooltip,
    Typography} from "antd";
import {Plus} from "lucide-react";
import NTable, {type NTableActionType, type NColumn} from "@/components/NTable";
import {useTranslation} from "react-i18next";
import {useMutation} from "@tanstack/react-query";
import {DatabaseWorkOrder, dbWorkOrderApi} from "@/api/db-work-order-api";
import DatabaseWorkOrderModal from "@/pages/facade/DatabaseWorkOrderModal.tsx";
import {getSort} from "@/utils/sort";
import {useMobile} from "@/hook/use-mobile";
import {cn} from "@/lib/utils";
import {debounce} from "@/utils/debounce";
import FacadeCompactSearch from "@/pages/facade/components/FacadeCompactSearch";

const {Text} = Typography;

const DatabaseWorkOrderUserPageContent = () => {
    const {t} = useTranslation();
    const {isMobile} = useMobile();
    const {message} = App.useApp();
    const actionRef = useRef<NTableActionType>(null);
    const [open, setOpen] = useState(false);
    const [keyword, setKeyword] = useState<string>('');

    const reloadTable = debounce(() => {
        actionRef.current?.reload();
    }, 300);

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
            unknown: {color: 'orange', label: t('db.work_order.status.unknown')},
        };
        const item = map[status] || {color: 'default', label: status};
        if (status === 'unknown') {
            return <Tooltip title={<div>{t('db.work_order.unknown_tip')}{error && <div>{error}</div>}</div>}><Tag color={item.color}>{item.label}</Tag></Tooltip>;
        }
        if ((status === 'failed' || status === 'rejected' || status === 'unknown') && error) {
            return (
                <Tooltip title={error}>
                    <Tag color={item.color}>{item.label}</Tag>
                </Tooltip>
            );
        }
        return <Tag color={item.color}>{item.label}</Tag>;
    };

    const columns: NColumn<DatabaseWorkOrder>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
            hideInTable: isMobile,
        },
        {
            title: t('db.work_order.id'),
            dataIndex: 'id',
            render: (value: string) => <Text copyable>{value}</Text>,
            width: 180,
            hideInSearch: true,
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
                unknown: {text: t('db.work_order.status.unknown')},
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
            title: t('db.work_order.database_username'),
            dataIndex: 'databaseUsername',
            render: (value: string) => value || '-',
            width: 150,
            hideInSearch: true,
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
        <div className={cn('min-h-full px-4 py-5 lg:px-20 lg:py-6', isMobile && 'px-3 py-3')}>
            <div className={'mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'}>
                <div className={'flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center'}>
                    <div className={'truncate text-lg font-semibold leading-7 text-slate-900 dark:text-slate-100'}>
                        {t('menus.work_order.submenus.db_work_order')}
                    </div>
                    <div className={'w-full sm:w-72 lg:w-80'}>
                        <FacadeCompactSearch
                            value={keyword}
                            placeholder={t('general.search_placeholder')}
                            onChange={(value) => {
                                setKeyword(value);
                                reloadTable();
                            }}
                        />
                    </div>
                </div>
                <Button
                    type="primary"
                    icon={<Plus className={'h-4 w-4'} />}
                    size="middle"
                    onClick={() => setOpen(true)}
                >
                    {t('db.work_order.new')}
                </Button>
            </div>

            <NTable
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
                headerTitle={false}
                options={{
                    density: !isMobile,
                    fullScreen: !isMobile,
                    reload: false,
                    setting: !isMobile,
                }}
            />

            <DatabaseWorkOrderModal
                open={open}
                confirmLoading={createMutation.isPending}
                handleCancel={() => setOpen(false)}
                handleOk={createMutation.mutate}
            />
        </div>
    );
};

const DatabaseWorkOrderUserPage = () => {
    const {license, isLoading} = useLicense();
    return <Disabled feature="sql_work_order" disabled={isLoading || !license.hasPremiumFeatures()}>
        <DatabaseWorkOrderUserPageContent/>
    </Disabled>;
};

export default DatabaseWorkOrderUserPage;
