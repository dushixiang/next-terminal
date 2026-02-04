import React, {useRef} from 'react';
import {App, Button, Tag, Tooltip, Typography} from "antd";
import {ActionType, ProColumns, ProTable} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {useMutation} from "@tanstack/react-query";
import databaseSQLLogApi, {DatabaseSQLLog} from "@/api/database-sql-log-api";
import {getSort} from "@/utils/sort";
import {DatabaseAssetSelect, UserSelect} from "@/components/shared/QuerySelects";

const {Text} = Typography;

const stripAppComment = (sql?: string) => {
    if (!sql) {
        return '';
    }
    let text = sql.trimStart();
    while (text.startsWith('/*')) {
        const endIndex = text.indexOf('*/');
        if (endIndex === -1) {
            break;
        }
        const comment = text.slice(0, endIndex + 2);
        if (!/ApplicationName\s*=/.test(comment)) {
            break;
        }
        text = text.slice(endIndex + 2).trimStart();
    }
    return text;
};

const DatabaseSQLLogPage = () => {
    const {t} = useTranslation();
    const actionRef = useRef<ActionType>(null);
    const {modal} = App.useApp();

    const clearMutation = useMutation({
        mutationFn: databaseSQLLogApi.clear,
        onSuccess: () => {
            actionRef.current?.reload();
        }
    });

    const statusTag = (status: string, errorMessage?: string) => {
        const map: Record<string, {color: string; label: string}> = {
            success: {color: 'success', label: t('general.success')},
            failed: {color: 'error', label: t('general.failed')},
            blocked: {color: 'warning', label: t('db.sql_log.status.blocked')},
        };
        const item = map[status] || {color: 'default', label: status};
        if ((status === 'failed' || status === 'blocked') && errorMessage) {
            return (
                <Tooltip title={errorMessage}>
                    <Tag color={item.color}>{item.label}</Tag>
                </Tooltip>
            );
        }
        return <Tag color={item.color}>{item.label}</Tag>;
    };

    const columns: ProColumns<DatabaseSQLLog>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('menus.resource.submenus.database_asset'),
            dataIndex: 'assetName',
            hideInSearch: false,
            renderFormItem: (_, {type, ...rest}) => {
                if (type === 'form') {
                    return null;
                }
                return <DatabaseAssetSelect {...rest} />;
            },
            formItemProps: {
                name: 'assetId',
            },
            ellipsis: true,
        },
        {
            title: t('db.asset.database'),
            dataIndex: 'database',
            hideInSearch: true,
            ellipsis: true,
        },
        {
            title: t('menus.identity.submenus.user'),
            dataIndex: 'userName',
            renderFormItem: (_, {type, ...rest}) => {
                if (type === 'form') {
                    return null;
                }
                return <UserSelect {...rest} />;
            },
            formItemProps: {
                name: 'userId',
            },
        },
        {
            title: t('audit.accessLog.stats.table.referer'),
            dataIndex: 'source',
            valueEnum: {
                proxy: {text: t('db.sql_log.source.proxy')},
                'work-order': {text: t('db.sql_log.source.work_order')},
            },
            render: (_, record) => {
                if (record.source === 'proxy') {
                    return <Tag color="blue">{t('db.sql_log.source.proxy')}</Tag>;
                }
                if (record.source === 'work-order') {
                    return <Tag color="purple">{t('db.sql_log.source.work_order')}</Tag>;
                }
                return <Tag>{record.source}</Tag>;
            },
            width: 80,
        },
        {
            title: t('general.status'),
            dataIndex: 'status',
            valueEnum: {
                success: {text: t('general.success')},
                failed: {text: t('general.failed')},
                blocked: {text: t('db.sql_log.status.blocked')},
            },
            render: (_, record) => statusTag(record.status, record.errorMessage),
            width: 80,
        },
        {
            title: t('db.sql_log.duration_ms'),
            dataIndex: 'durationMs',
            hideInSearch: true,
            width: 120,
        },
        {
            title: t('db.sql_log.rows_affected'),
            dataIndex: 'rowsAffected',
            hideInSearch: true,
            width: 120,
        },
        {
            title: t('audit.client_ip'),
            dataIndex: 'clientIp',
            hideInSearch: true,
            width: 140,
        },
        {
            title: t('db.sql_log.sql'),
            dataIndex: 'sql',
            hideInSearch: true,
            render: (_,record) => {
                const cleanedSQL = stripAppComment(record.sql);
                if (!cleanedSQL) {
                    return '-';
                }
                return (
                    <Tooltip title={cleanedSQL} placement="topLeft">
                        <Text ellipsis style={{maxWidth: 300}}>{cleanedSQL}</Text>
                    </Tooltip>
                );
            },
        },
        {
            title: t('general.created_at'),
            dataIndex: 'createdAt',
            valueType: 'dateTime',
            hideInSearch: true,
            sorter: true,
            width: 180,
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
                        assetId: params.assetId,
                        userId: params.userId,
                        status: params.status,
                        source: params.source,
                    };
                    const result = await databaseSQLLogApi.paging(queryParams);
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
                scroll={{
                    x: 'max-content'
                }}
                pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true
                }}
                dateFormatter="string"
                headerTitle={t('menus.log_audit.submenus.database_sql_log')}
                toolBarRender={() => [
                    <Button key="clear"
                            type="primary"
                            danger
                            onClick={() => {
                                modal.confirm({
                                    title: t('general.clear_confirm'),
                                    onOk: async () => {
                                        return clearMutation.mutate();
                                    }
                                })
                            }}>
                        {t('actions.clear')}
                    </Button>,
                ]}
            />
        </div>
    );
};

export default DatabaseSQLLogPage;
