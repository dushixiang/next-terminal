import React, {useEffect, useRef, useState} from 'react';

import {App, Button, Popconfirm, Space, Switch, Table} from "antd";
import {useNavigate, useSearchParams} from "react-router-dom";
import {ActionType, ProColumns, ProTable, TableDropdown} from "@ant-design/pro-components";
import userApi, {CreateUserResult, User} from "@/src/api/user-api";
import {useTranslation} from "react-i18next";
import UserModal from "./UserModal";
import {useMutation} from "@tanstack/react-query";
import NButton from "@/src/components/NButton";
import NLink from "@/src/components/NLink";
import copy from 'copy-to-clipboard';
import {maybe} from "@/src/utils/maybe";
import UserResetPasswordModal from "@/src/pages/identity/UserResetPasswordModal";

const api = userApi;

const UserPage = () => {
    const {t} = useTranslation();
    const actionRef = useRef<ActionType>();

    let [open, setOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>();

    let [selectedRowKeys, setSelectedRowKeys] = useState<string[]>();
    let [resetPasswordOpen, setResetPasswordOpen] = useState<boolean>(false);

    let [searchParams, setSearchParams] = useSearchParams();
    let [userType, setUserType] = useState<string>(maybe(searchParams.get('type'), 'super-admin'));

    let navigate = useNavigate();
    let {message, modal} = App.useApp();

    useEffect(() => {
        actionRef.current?.reload();
    }, [userType]);

    const postOrUpdate = async (values: any) => {
        if (values['id']) {
            await api.updateById(values['id'], values);
        } else {
            let result = await api.create(values) as unknown as CreateUserResult;
            console.log(result);
            modal.success({
                title: t('identity.user.new_user_result'),
                content: <div>
                    <div>{t('identity.user.nickname')}: {result.nickname}</div>
                    <div>{t('identity.user.username')}: {result.username}</div>
                    <div>{t('identity.user.password')}: {result.password}</div>
                </div>,
                okText: t('actions.copy'),
                onOk: () => {
                    copy(`${t('identity.user.nickname')}: ${result.nickname}
${t('identity.user.username')}: ${result.username}
${t('identity.user.password')}: ${result.password}`)
                    message.success(t('general.copy_success'));
                }
            })
        }
    }

    let mutation = useMutation({
        mutationFn: postOrUpdate,
        onSuccess: () => {
            actionRef.current?.reload();
            setOpen(false);
            setSelectedRowKey(undefined);
            showSuccess();
        }
    });

    let resetPasswordMutation = useMutation({
        mutationFn: (values) => {
            return userApi.resetPassword(selectedRowKeys, values['password']);
        },
        onSuccess: (newPassword) => {
            setResetPasswordOpen(false);
            modal.success({
                title: t('identity.user.options.reset.password.success'),
                content: <div>
                    <div>{t('identity.user.options.reset.password.new')}: {newPassword}</div>
                </div>,
                okText: t('actions.copy'),
                onOk: () => {
                    copy(newPassword)
                    message.success(t('general.copy_success'));
                }
            })
        }
    });

    const columns: ProColumns<User>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        }, {
            title: t('identity.user.nickname'),
            dataIndex: 'nickname',
            key: 'nickname',
            sorter: true,
            render: (text, record) => {
                return <NLink to={`/user/${record['id']}`}>{text}</NLink>;
            }
        }, {
            title: t('identity.user.username'),
            dataIndex: 'username',
            key: 'username',
            sorter: true,
        }, {
            title: t('identity.user.mail'),
            dataIndex: 'mail',
            key: 'mail',
        }, {
            title: t('identity.user.status'),
            dataIndex: 'status',
            key: 'status',
            hideInSearch: true,
            render: (status, record, index) => {
                return <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}
                               checked={status !== 'disabled'}
                               onChange={checked => {
                                   let op = checked ? 'enabled' : 'disabled';
                                   api.changeStatus(record['id'], op)
                                       .then(() => {
                                           actionRef.current?.reload();
                                       });
                               }}/>
            }
        }, {
            title: t('identity.user.login'),
            dataIndex: 'online',
            key: 'online',
            valueType: 'radio',
            valueEnum: {
                true: {text: t('identity.user.logins.online'), status: 'success'},
                false: {text: t('identity.user.logins.offline'), status: 'default'},
            },
            hideInSearch: true,
        },
        {
            title: t('general.created_at'),
            key: 'createdAt',
            dataIndex: 'createdAt',
            valueType: 'dateTime',
            hideInSearch: true,
            sorter: true,
        },
        {
            title: t('actions.option'),
            valueType: 'option',
            key: 'option',
            render: (text, record, _, action) => [
                <NButton
                    key="edit"
                    onClick={() => {
                        setOpen(true);
                        setSelectedRowKey(record.id);
                    }}
                >
                    {t('actions.edit')}
                </NButton>
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
                </Popconfirm>,
                <TableDropdown
                    key="actionGroup"
                    onSelect={(key) => {
                        switch (key) {
                            case 'detail':
                                navigate(`/user/${record['id']}?activeKey=info`);
                                break;
                            case 'reset-password':
                                bulkResetPassword([record['id']])
                                break;
                            case 'reset-totp':
                                bulkResetTOTP([record['id']])
                                break;
                            case 'authorised-asset':
                                navigate(`/user/${record['id']}?activeKey=asset`);
                                break;
                            case 'login-policy':
                                navigate(`/user/${record['id']}?activeKey=login-policy`);
                                break;
                        }
                    }}
                    menus={[
                        {key: 'detail', name: t('actions.detail')},
                        {key: 'reset-password', name: t('identity.user.options.reset.password.action')},
                        {key: 'reset-totp', name: t('identity.user.options.reset.otp.action')},
                        {key: 'authorised-asset', name: t('identity.options.authorized_asset')},
                        {key: 'login-policy', name: t('identity.options.login_policy')},
                    ]}
                />,
            ],
        },
    ];

    const bulkResetPassword = (keys: string[]) => {
        setResetPasswordOpen(true);
        setSelectedRowKeys(keys);
    }

    function showSuccess() {
        message.open({
            type: 'success',
            content: t('general.success'),
        });
    }

    const bulkResetTOTP = (keys: string[]) => {
        modal.confirm({
            title: t('identity.user.options.reset.otp.confirm.title'),
            content: t('identity.user.options.reset.otp.confirm.content'),
            onOk() {
                userApi.resetTOTP(keys).then(showSuccess)
            },
        });
    }

    return (<div>
        <ProTable
            columns={columns}
            actionRef={actionRef}
            columnsState={{
                persistenceKey: 'user-table',
                persistenceType: 'localStorage',
            }}
            rowSelection={{
                selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT],
            }}
            tableAlertOptionRender={({selectedRowKeys}) => {
                return (
                    <Space size={16}>
                        <a className='danger'
                           onClick={() => {
                               bulkResetPassword(selectedRowKeys as string[])
                           }}
                        >
                            {t('identity.user.options.reset.password.action')}
                        </a>
                        <a className='danger'
                           onClick={() => {
                               bulkResetTOTP(selectedRowKeys as string[])
                           }}>
                            {t('identity.user.options.reset.otp.action')}
                        </a>
                    </Space>
                );
            }}
            request={async (params = {}, sort, filter) => {

                let queryParams = {
                    pageIndex: params.current,
                    pageSize: params.pageSize,
                    sort: JSON.stringify(sort),
                    nickname: params.nickname,
                    username: params.username,
                    mail: params.mail,
                    online: params.online,
                    type: userType,
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
            toolbar={{
                menu: {
                    type: 'tab',
                    items: [
                        {key: 'super-admin', label: t('identity.user.types.super_admin'),},
                        {key: 'admin', label: t('identity.user.types.admin'),},
                        {key: 'user', label: t('identity.user.types.normal'),},
                    ],
                    activeKey: userType,
                    onChange: (activeKey) => {
                        setUserType(activeKey as string);
                        setSearchParams({'type': activeKey as string});

                    }
                },
                actions: [
                    <Button key="button" type="primary" onClick={() => {
                        setOpen(true)
                    }}>
                        {t('actions.new')}
                    </Button>
                ]
            }}
        />

        <UserModal
            id={selectedRowKey}
            open={open}
            confirmLoading={mutation.isPending}
            handleCancel={() => {
                setOpen(false);
                setSelectedRowKey(undefined);
            }}
            handleOk={mutation.mutate}
        />

        <UserResetPasswordModal
            open={resetPasswordOpen}
            confirmLoading={resetPasswordMutation.isPending}
            handleCancel={() => {
                setResetPasswordOpen(false);
                setSelectedRowKeys([]);
            }}
            handleOk={resetPasswordMutation.mutate}
        />
    </div>);
}

export default UserPage;
