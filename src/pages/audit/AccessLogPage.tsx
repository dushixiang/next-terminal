import React, {useRef} from 'react';
import {ActionType, ProColumns, ProTable} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import accessLogApi, {AccessLog} from "@/src/api/access-log-api";
import {App, Button, Tag} from "antd";
import {useMutation} from "@tanstack/react-query";
import {renderSize} from "@/src/utils/utils";
import {useWindowSize} from 'react-use';

const AccessLogPage = () => {
    const {t} = useTranslation();
    const actionRef = useRef<ActionType>();
    let {modal} = App.useApp();

    let clearMutation = useMutation({
        mutationFn: accessLogApi.clear,
        onSuccess: () => {
            actionRef.current?.reload();
        }
    });
    const {width} = useWindowSize();

    const getStatusColor = (statusCode: number) => {
        if (statusCode >= 200 && statusCode < 300) {
            return 'green';
        } else if (statusCode >= 300 && statusCode < 400) {
            return 'blue';
        } else if (statusCode >= 400 && statusCode < 500) {
            return 'orange';
        } else if (statusCode >= 500) {
            return 'red';
        }
        return 'default';
    };

    const columns: ProColumns<AccessLog>[] = [
        {
            title: t('audit.accessLog.domain'),
            key: 'domain',
            dataIndex: 'domain',
            width: 150,
            ellipsis: true,
            render: (text) => <code>{text}</code>,
            fixed: 'left',
        },
        {
            title: t('audit.accessLog.user'),
            key: 'accountName',
            dataIndex: 'accountName',
            hideInSearch: true,
            width: 120,
            ellipsis: true,
            render: (text, record) => {
                const accountId = record.accountId;
                
                // 处理不同类型的用户ID
                if (!accountId) {
                    return <Tag color="gray">{t('audit.accessLog.anonymous')}</Tag>;
                }
                
                if (accountId === 'anonymous') {
                    return <Tag color="blue">{t('audit.accessLog.anonymous')}</Tag>;
                }
                
                if (accountId.startsWith('whitelist-')) {
                    const ip = accountId.replace('whitelist-', '');
                    return <Tag color="green" title={ip}>
                        {t('audit.accessLog.whitelist')}
                    </Tag>;
                }
                
                if (accountId.startsWith('temp-pass-')) {
                    const ip = accountId.replace('temp-pass-', '');
                    return <Tag color="orange" title={ip}>
                        {t('audit.accessLog.tempPass')}
                    </Tag>;
                }
                
                // 真实用户ID，显示用户名和链接
                if (text) {
                    return <Link to={`/user/${accountId}`}>{text}</Link>;
                }
                
                // 有accountId但没有用户名（可能是已删除的用户）
                return <Tag color="red" title={accountId}>
                    {t('audit.accessLog.deletedUser')}
                </Tag>;
            },
            fixed: 'left',
        },
        {
            title: t('audit.accessLog.method'),
            key: 'method',
            dataIndex: 'method',
            valueType: 'select',
            width: 100,
            valueEnum: {
                'GET': {text: 'GET', status: 'Success'},
                'POST': {text: 'POST', status: 'Processing'},
                'PUT': {text: 'PUT', status: 'Warning'},
                'DELETE': {text: 'DELETE', status: 'Error'},
                'PATCH': {text: 'PATCH', status: 'Default'},
                'HEAD': {text: 'HEAD', status: 'Default'},
                'OPTIONS': {text: 'OPTIONS', status: 'Default'},
            },
        },
        {
            title: t('audit.accessLog.uri'),
            key: 'uri',
            dataIndex: 'uri',
            hideInSearch: true,
            ellipsis: true,
            width: 300,
            render: (text) => <code className="text-xs">{text}</code>
        },
        {
            title: t('audit.accessLog.statusCode'),
            key: 'statusCode',
            dataIndex: 'statusCode',
            width: 100,
            render: (text: number) => <Tag color={getStatusColor(text)}>{text}</Tag>
        },
        {
            title: t('audit.accessLog.responseSize'),
            key: 'responseSize',
            dataIndex: 'responseSize',
            hideInSearch: true,
            width: 100,
            render: (text: number) => renderSize(text)
        },
        {
            title: t('audit.accessLog.clientIp'),
            key: 'clientIp',
            dataIndex: 'clientIp',
            width: 140,
            ellipsis: true,
            render: (text) => <code>{text}</code>
        },
        {
            title: t('audit.accessLog.responseTime'),
            key: 'responseTime',
            dataIndex: 'responseTime',
            hideInSearch: true,
            width: 100,
            render: (text: number) => `${text}ms`
        },
        {
            title: t('audit.accessLog.userAgent'),
            key: 'userAgent',
            dataIndex: 'userAgent',
            hideInSearch: true,
            ellipsis: true,
            width: 250,
            render: (text) => <span className="text-xs" title={String(text || '')}>{text}</span>
        },
        {
            title: t('audit.accessLog.createdAt'),
            key: 'createdAt',
            dataIndex: 'createdAt',
            hideInSearch: true,
            valueType: 'dateTime',
            width: 191,
        },
    ];

    return (
        <div
            style={{width: window.innerWidth - 240}}
        >
            <ProTable
                defaultSize={'small'}
                columns={columns}
                actionRef={actionRef}
                scroll={{x: 1600}}
                request={async (params = {}, sort, filter) => {
                    let queryParams = {
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        sort: JSON.stringify(sort),
                        domain: params.domain,
                        method: params.method,
                        statusCode: params.statusCode,
                        clientIp: params.clientIp,
                        accountId: params.accountId,
                    }
                    let result = await accessLogApi.getPaging(queryParams);
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
                headerTitle={t('audit.accessLog.title')}
                toolBarRender={() => [
                    <Button key="clear"
                            type="primary"
                            danger
                            onClick={() => {
                                modal.confirm({
                                    title: t('audit.accessLog.clearConfirmTitle'),
                                    content: t('audit.accessLog.clearConfirmContent'),
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

export default AccessLogPage; 