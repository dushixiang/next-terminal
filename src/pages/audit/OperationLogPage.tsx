import {App, Button, Tag, Tooltip} from 'antd';
import React, {useRef} from 'react';
import {ActionType, ProColumns, ProTable} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {getSort} from "@/src/utils/sort";
import {useMutation} from "@tanstack/react-query";
import operationLogApi, {OperationLog} from "@/src/api/operation-log-api";

const OperationLogPage = () => {

    const {t} = useTranslation();
    const actionRef = useRef<ActionType>();

    let {modal} = App.useApp();

    let clearMutation = useMutation({
        mutationFn: operationLogApi.clear,
        onSuccess: () => {
            actionRef.current?.reload();
        }
    });

    const columns: ProColumns<OperationLog>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('audit.operation.account'),
            dataIndex: 'accountName',
            key: 'accountName',
            hideInSearch: true
        },
        {
            title: t('audit.operation.label'),
            dataIndex: 'action',
            key: 'action',
            render: (_, record) => {
                let color = 'blue';
                if (record.action.includes('add')) {
                    color = 'green';
                } else if (record.action.includes('delete')) {
                    color = 'red';
                }
                return <Tag bordered={false}
                            color={color}>{t('audit.operation.options.' + record.action.replaceAll('-', '_'))}</Tag>;
            },
            hideInSearch: true
        },
        {
            title: t('audit.operation.content'),
            dataIndex: 'content',
            key: 'content',
            hideInSearch: true
        },
        {
            title: t('audit.operation.status'),
            dataIndex: 'success',
            key: 'success',
            hideInSearch: true,
            render: (text, record) => {
                if (text === 'failed') {
                    return <Tooltip title={record.errorMessage}>
                        <Tag color="error">{t('general.failed')}</Tag>
                    </Tooltip>
                } else {
                    return <Tag color="success">{t('general.success')}</Tag>
                }
            }
        },
        {
            title: t('audit.client_ip'),
            dataIndex: 'ip',
            key: 'ip',
            render: (text, record) => {
                return `${text} (${record.region})`;
            },
        },
        {
            title: t('audit.user_agent'),
            dataIndex: 'userAgent',
            key: 'userAgent',
            hideInSearch: true,
            render: (_, record) => {
                let userAgent = record.userAgent;
                if (!userAgent) {
                    return '-';
                }
                return `${userAgent?.OS} ${userAgent?.OSVersion} ${userAgent?.Name} ${userAgent?.Version}`;
            }
        }, {
            title: t('audit.operation.at'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            hideInSearch: true,
            valueType: 'dateTime',
            sorter: true,
        }
    ];

    return (
        <div>
            <ProTable
                defaultSize={'small'}
                columns={columns}
                actionRef={actionRef}
                    request={async (params = {}, sort, filter) => {
                        let [sortOrder, sortField] = getSort(sort);
                        
                        let queryParams = {
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        sortOrder: sortOrder,
                        sortField: sortField,
                        username: params.username,
                        clientIp: params.clientIp,
                    }
                    let result = await operationLogApi.getPaging(queryParams);
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
                dateFormatter="string"
                headerTitle={t('menus.log_audit.submenus.operation_log')}
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

export default OperationLogPage;