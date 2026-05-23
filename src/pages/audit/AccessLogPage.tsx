import React, {useRef} from 'react';
import NTable, {type NTableActionType, type NColumn} from "@/components/NTable";
import {useTranslation} from "react-i18next";
import {getSort} from "@/utils/sort";
import {Link} from "react-router-dom";
import accessLogApi, {AccessLog} from "@/api/access-log-api";
import {App, Button, Tag, Typography} from "antd";
import {useMutation} from "@tanstack/react-query";
import {renderSize} from "@/utils/utils";
import {useMobile} from "@/hook/use-mobile";

const AccessLogPage = () => {
    const {t} = useTranslation();
    const actionRef = useRef<NTableActionType>(null);
    let {modal} = App.useApp();

    let clearMutation = useMutation({
        mutationFn: accessLogApi.clear,
        onSuccess: () => {
            actionRef.current?.reload();
        }
    });
    let {isMobile} = useMobile();

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

    const columns: NColumn<AccessLog>[] = [
        {
            title: t('assets.domain'),
            key: 'domain',
            dataIndex: 'domain',
            width: 150,
            ellipsis: true,
            render: (text) => <code>{text}</code>,
            fixed: !isMobile ? 'left' : undefined,
        },
        {
            title: t('menus.identity.submenus.user'),
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

                if (accountId.startsWith('public-allow-')) {
                    const ip = accountId.replace('public-allow-', '');
                    return <Tag color="green" title={ip}>
                        {t('audit.accessLog.publicAllow')}
                    </Tag>;
                }

                if (accountId.startsWith('whitelist-')) {
                    const ip = accountId.replace('whitelist-', '');
                    return <Tag color="green" title={ip}>
                        {t('audit.accessLog.whitelist')}
                    </Tag>;
                }

                if (accountId.startsWith('temp-allow-')) {
                    const ip = accountId.replace('temp-allow-', '');
                    return <Tag color="cyan" title={ip}>
                        {t('audit.accessLog.tempAllow')}
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
            fixed: !isMobile ? 'left' : undefined,
        },
        {
            title: t('assets.website_response_modify.match_method'),
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
            width: 300,
            render: (text) => {
                const value = String(text || '-');
                return (
                    <Typography.Text
                        className="text-xs font-mono"
                        ellipsis={{tooltip: value}}
                        style={{display: 'block', width: '100%'}}
                        copyable={text ? {text: String(text)} : false}
                    >
                        {value}
                    </Typography.Text>
                );
            }
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
            title: t('audit.client_ip'),
            key: 'clientIp',
            dataIndex: 'clientIp',
            width: 140,
            ellipsis: true,
            render: (text, record) => {
                let view = <div>{text}</div>;
                const title = record.region;
                return <div className={'flex items-center gap-2'}>
                    {view}
                    <Typography.Text type="secondary">{title}</Typography.Text>
                </div>
            },
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
            width: 250,
            render: (text) => {
                const value = String(text || '-');
                return (
                    <Typography.Text
                        className="text-xs"
                        ellipsis={{tooltip: value}}
                        style={{display: 'block', width: '100%'}}
                        copyable={text ? {text: String(text)} : false}
                    >
                        {value}
                    </Typography.Text>
                );
            }
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
        <div>
            <NTable
                defaultSize={'small'}
                columns={columns}
                actionRef={actionRef}
                scroll={{x: 'max-content'}}
                request={async (params = {}, sort, filter) => {
                    let [sortOrder, sortField] = getSort(sort);

                    let queryParams = {
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        sortOrder: sortOrder,
                        sortField: sortField,
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
                headerTitle={t('menus.log_audit.submenus.access_log')}
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
