import React, {useRef} from 'react';
import {Button, Popconfirm, Tag} from "antd";
import {ActionType, ProColumns, ProTable, TableDropdown} from "@ant-design/pro-components";
import {Link, useNavigate} from "react-router-dom";
import {SafetyCertificateOutlined, StopOutlined} from "@ant-design/icons";
import loginPolicyApi, {LoginPolicy} from "../../api/login-policy-api";
import {useTranslation} from "react-i18next";
import NButton from "../../components/NButton";
import NLink from "@/src/components/NLink";
import {useLicense} from "@/src/hook/use-license";
import Disabled from "@/src/components/Disabled";

const api = loginPolicyApi;

const LoginPolicyPage = () => {

    const {t} = useTranslation();
    const actionRef = useRef<ActionType>();

    let navigate = useNavigate();
    let [license] = useLicense();

    const columns: ProColumns<LoginPolicy>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('identity.policy.name'),
            dataIndex: 'name',
            render: (text, record) => {
                return <NLink to={`/login-policy/${record['id']}`}>{text}</NLink>;
            },
        },
        {
            title: t('identity.policy.priority'),
            key: 'priority',
            dataIndex: 'priority',
            sorter: true,
            defaultSortOrder: "ascend",
            hideInSearch: true,
        },
        {
            title: t('identity.policy.ip_group'),
            key: 'ipGroup',
            dataIndex: 'ipGroup',
            sorter: false,
            hideInSearch: true,
        },
        {
            title: t('identity.policy.action.label'),
            key: 'rule',
            dataIndex: 'rule',
            hideInSearch: true,
            render: (text => {
                if (text === 'allow') {
                    return <Tag icon={<SafetyCertificateOutlined/>} color="success" bordered={false}>
                        {t('identity.policy.action.options.allow')}
                    </Tag>;
                } else {
                    return <Tag icon={<StopOutlined/>} color="error" bordered={false}>
                        {t('identity.policy.action.options.reject')}
                    </Tag>;
                }
            })
        },
        {
            title: t('identity.policy.status'),
            key: 'enabled',
            dataIndex: 'enabled',
            hideInSearch: true,
            valueEnum: {
                true: {text: t('general.enabled'), status: 'success'},
                false: {text: t('general.disabled'), status: 'default'},
            }
        },
        {
            title: t('identity.user.expiration_at'),
            key: 'expirationAt',
            dataIndex: 'expirationAt',
            hideInSearch: true,
            sorter: true,
            valueType: 'dateTime',
            width: 191,
        },
        {
            title: t('actions.option'),
            valueType: 'option',
            key: 'option',
            width: 160,
            render: (text, record, _, action) => [
                <Link to={`/login-policy/new?loginPolicyId=${record.id}`}>
                    <NButton key="edit">
                        {t('actions.edit')}
                    </NButton>
                </Link>
                ,
                <Popconfirm
                    key={'delete-confirm'}
                    title={t('general.delete_confirm')}
                    onConfirm={async () => {
                        await api.deleteById(record.id);
                        actionRef.current?.reload();
                    }}
                >
                    <NButton key='delete' danger={true}>{t('actions.delete')}</NButton>
                </Popconfirm>
                ,
                <TableDropdown
                    key="actionGroup"
                    onSelect={(key) => {
                        switch (key) {
                            case 'login-policy-detail':
                                navigate(`/login-policy/${record['id']}?activeKey=info`);
                                break;
                            case 'login-policy-bind-user':
                                navigate(`/login-policy/${record['id']}?activeKey=bind-user`);
                                break;
                        }
                    }}
                    menus={[
                        {key: 'login-policy-detail', name: t('actions.detail')},
                        {key: 'login-policy-bind-user', name: t('actions.binding')},
                    ]}
                />,
            ],
        },
    ];

    return (
        <div>
            <Disabled disabled={license.isFree()}>
                <ProTable
                    columns={columns}
                    actionRef={actionRef}
                    request={async (params = {}, sort, filter) => {

                        let queryParams = {
                            pageIndex: params.current,
                            pageSize: params.pageSize,
                            sort: JSON.stringify(sort),
                            name: params.name,
                        }
                        let result = await api.getPaging(queryParams);
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
                    headerTitle={t('menus.identity.submenus.login_policy')}
                    toolBarRender={() => [
                        <Link to={'/login-policy/new'}>
                            <Button key="button" type="primary">
                                {t('actions.new')}
                            </Button>
                        </Link>
                    ]}
                />
            </Disabled>
        </div>
    );
}

export default LoginPolicyPage;