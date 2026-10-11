import loginLogApi from "@/api/login-log-api";
import { LoginLog } from "@/api/user-api";
import IPRegion from "@/components/IPRegion";
import NTable,{ type NColumn,type NTableActionType } from "@/components/NTable";
import { getSort } from "@/utils/sort";
import { useMutation } from "@tanstack/react-query";
import {
App,
Button,
Tag
} from 'antd';
import { useRef } from 'react';
import { useTranslation } from "react-i18next";

// 精确匹配系统固定错误，保留外部认证错误及带有额外细节的错误原文。
const loginReasonKeys: Record<string, string> = {
    'account or password is incorrect': 'account_incorrect',
    'account is disabled': 'account_disabled',
    'two-factor authorization code incorrect': 'otp_incorrect',
    'your IP address is not allowed to access the system': 'ip_not_allowed',
    'current time period is not allowed to access the system': 'time_not_allowed',
    'your geographic location is not allowed to access the system': 'geo_not_allowed',
    'access is not allowed by the system access policy': 'policy_not_allowed',
    'password login is disabled': 'password_login_disabled',
};

const LoginLogPage = () => {

    const {t} = useTranslation();
    const actionRef = useRef<NTableActionType>(null);

    let {modal} = App.useApp();

    let clearMutation = useMutation({
        mutationFn: loginLogApi.clear,
        onSuccess: () => {
            actionRef.current?.reload();
        }
    });

    const columns: NColumn<LoginLog>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('gateways.username'),
            dataIndex: 'username',
            key: 'username'
        },
        {
            title: t('audit.client_ip'),
            dataIndex: 'clientIp',
            key: 'clientIp',
            render: (_, record) => <IPRegion ip={record.clientIp} regionInfo={record.regionInfo}/>,
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
            render: (_, record) => {
                const reason = record.reason || '';
                const key = loginReasonKeys[reason];
                return key ? <span title={reason}>{t(`audit.login_reasons.${key}`)}</span> : reason || '-';
            },
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
            <NTable
                defaultSize={'small'}
                columns={columns}
                actionRef={actionRef}
                    request={async (params = {}, sort, _filter) => {
                        let [sortOrder, sortField] = getSort(sort);
                        
                        let queryParams = {
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        sortOrder: sortOrder,
                        sortField: sortField,
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
