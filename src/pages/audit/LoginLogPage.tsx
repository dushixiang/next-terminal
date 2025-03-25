import {App, Button, Tag} from 'antd';
import React, {useRef} from 'react';
import {ActionType, ProColumns, ProTable} from "@ant-design/pro-components";
import loginLogApi from "@/src/api/login-log-api";
import {useTranslation} from "react-i18next";
import {useMutation} from "@tanstack/react-query";
import {LoginLog} from "@/src/api/user-api";

const LoginLogPage = () => {

    const {t} = useTranslation();
    const actionRef = useRef<ActionType>();

    let {modal} = App.useApp();

    let clearMutation = useMutation({
        mutationFn: loginLogApi.clear,
        onSuccess: () => {
            actionRef.current?.reload();
        }
    });

    const columns: ProColumns<LoginLog>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('audit.username'),
            dataIndex: 'username',
            key: 'username'
        },
        {
            title: t('audit.client_ip'),
            dataIndex: 'clientIp',
            key: 'clientIp',
            render: (text, record) => {
                return `${text} (${record.region})`;
            },
        }, {
            title: t('audit.login_status'),
            dataIndex: 'success',
            key: 'success',
            hideInSearch: true,
            render: text => {
                if (text !== true) {
                    return <Tag color="error">{t('general.failed')}</Tag>
                } else {
                    return <Tag color="success">{t('general.success')}</Tag>
                }
            }
        }, {
            title: t('audit.login_reason'),
            dataIndex: 'reason',
            key: 'reason',
            hideInSearch: true,
        }, {
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
            title: t('audit.login_at'),
            dataIndex: 'loginAt',
            key: 'loginAt',
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
                    let queryParams = {
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        sort: JSON.stringify(sort),
                        username: params.username,
                        clientIp: params.clientIp,
                    }
                    let result = await loginLogApi.getPaging(queryParams);
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
                headerTitle={t('menus.log_audit.submenus.login_log')}
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

export default LoginLogPage;