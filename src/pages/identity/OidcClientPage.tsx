import React, {useRef, useState} from 'react';
import {App, Button, Popconfirm, Space, Switch, Tag} from "antd";
import {ActionType, ProColumns, ProTable, TableDropdown} from "@ant-design/pro-components";
import oidcClientApi, {OidcClient, OidcClientCreateResponse} from "@/api/oidc-client-api";
import {useTranslation} from "react-i18next";
import {getSort} from "@/utils/sort";
import {useMutation} from "@tanstack/react-query";
import NButton from "@/components/NButton";
import copy from 'copy-to-clipboard';
import OidcClientModal from "./OidcClientModal";

const api = oidcClientApi;

const OidcClientPage = () => {
    const {t} = useTranslation();
    const actionRef = useRef<ActionType>(null);

    let [open, setOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>();
    let [selectedRowKeys, setSelectedRowKeys] = useState<string[]>();

    let {message, modal} = App.useApp();

    const postOrUpdate = async (values: any) => {
        if (values['id']) {
            await api.updateById(values['id'], values);
        } else {
            let result = await api.create(values) as unknown as OidcClientCreateResponse;
            modal.success({
                title: t('identity.oidc_client.created_success'),
                content: <div>
                    <div><strong>{t('settings.oidc.client_id')}:</strong> {result.client.clientId}</div>
                    <div><strong>{t('settings.oidc.client_secret')}:</strong> {result.secret}</div>
                    <div className="text-red-500 mt-2">{t('identity.oidc_client.created_copy_tip')}</div>
                </div>,
                okText: t('actions.copy'),
                onOk: () => {
                    copy(`Client ID: ${result.client.clientId}\nClient Secret: ${result.secret}`)
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
            message.success(t('general.success'));
        }
    });

    const showSuccess = () => {
        message.success(t('general.success'));
    }

    const deleteItems = async (keys: string[]) => {
        await api.deleteById(keys.join(','));
        showSuccess();
        actionRef.current?.reload();
        setSelectedRowKeys([]);
    }

    const statusMutation = useMutation({
        mutationFn: ({id, status}: { id: string, status: string }) => {
            return api.updateStatus(id, status);
        },
        onSuccess: () => {
            actionRef.current?.reload();
            showSuccess();
        }
    });

    const regenerateSecretMutation = useMutation({
        mutationFn: (id: string) => {
            return api.regenerateSecret(id);
        },
        onSuccess: (data) => {
            modal.success({
                title: t('identity.oidc_client.secret_regenerated'),
                content: <div>
                    <div><strong>{t('identity.oidc_client.new_secret_label')}:</strong> {data.clientSecret}</div>
                    <div className="text-red-500 mt-2">{t('identity.oidc_client.new_secret_tip')}</div>
                </div>,
                okText: t('actions.copy'),
                onOk: () => {
                    copy(data.clientSecret)
                    message.success(t('general.copy_success'));
                }
            })
        }
    });

    const columns: ProColumns<OidcClient>[] = [
        {
            title: t('general.name'),
            dataIndex: 'name',
            fixed: 'left',
        },
        {
            title: t('identity.oidc_client.client_id_label'),
            dataIndex: 'clientId',
            copyable: true,
        },
        {
            title: t('identity.oidc_client.redirect_uris'),
            dataIndex: 'redirectUris',
            search: false,
            render: (_, record) => {
                return record.redirectUris?.map(uri => (
                    <Tag key={uri}>{uri}</Tag>
                ))
            }
        },
        {
            title: t('identity.oidc_client.grant_types'),
            dataIndex: 'grantTypes',
            search: false,
            render: (_, record) => {
                return record.grantTypes?.map(type => (
                    <Tag key={type}>{type}</Tag>
                ))
            }
        },
        {
            title: t('identity.oidc_client.scopes'),
            dataIndex: 'scopes',
            search: false,
            render: (_, record) => {
                return record.scopes?.map(scope => (
                    <Tag key={scope}>{scope}</Tag>
                ))
            }
        },
        {
            title: t('general.status'),
            dataIndex: 'status',
            valueType: 'select',
            valueEnum: {
                'enabled': {text: t('general.enabled'), status: 'Success'},
                'disabled': {text: t('general.disabled'), status: 'Default'},
            },
            render: (_, record) => {
                return <Switch
                    checkedChildren={t('general.enabled')}
                    unCheckedChildren={t('general.disabled')}
                    checked={record.status === 'enabled'}
                    onChange={(checked) => {
                        statusMutation.mutate({
                            id: record.id,
                            status: checked ? 'enabled' : 'disabled'
                        });
                    }}
                />
            }
        },
        {
            title: t('general.description'),
            dataIndex: 'description',
            search: false,
            ellipsis: true,
        },
        {
            title: t('general.created_at'),
            dataIndex: 'createdAt',
            valueType: 'dateTime',
            search: false,
            sorter: true,
        },
        {
            title: t('actions.label'),
            valueType: 'option',
            fixed: 'right',
            render: (text, record) => [
                <NButton key="edit" onClick={() => {
                    setSelectedRowKey(record.id);
                    setOpen(true);
                }}>
                    {t('actions.edit')}
                </NButton>,
                <Popconfirm
                    key={'regenerate'}
                    title={t('identity.oidc_client.regenerate_secret')}
                    description={t('identity.oidc_client.regenerate_secret_confirm')}
                    onConfirm={async () => {
                        regenerateSecretMutation.mutate(record.id);
                    }}
                    okText={t('actions.confirm')}
                    cancelText={t('actions.cancel')}
                >
                    <NButton danger>
                        {t('identity.oidc_client.regenerate_secret')}
                    </NButton>
                </Popconfirm>,
                <TableDropdown
                    key="actionGroup"
                    menus={[
                        {
                            key: 'delete',
                            name: (
                                <Popconfirm
                                    title={t('general.confirm_delete')}
                                    onConfirm={async () => {
                                        await deleteItems([record.id]);
                                    }}
                                    okText={t('actions.confirm')}
                                    cancelText={t('actions.cancel')}
                                >
                                    {t('actions.delete')}
                                </Popconfirm>
                            ),
                        },
                    ]}
                />,
            ],
        },
    ];

    return (
        <>
            <ProTable<OidcClient>
                columns={columns}
                actionRef={actionRef}
                request={async (params = {}, sort) => {
                    let [sortOrder, sortField] = getSort(sort);

                    let queryParams = {
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        sortOrder: sortOrder,
                        sortField: sortField,
                        name: params.name,
                        clientId: params.clientId,
                        status: params.status,
                    };

                    let result = await api.getPaging(queryParams);
                    return {
                        data: result['items'],
                        success: true,
                        total: result['total'],
                    };
                }}
                columnsState={{
                    persistenceKey: 'oidc-client-table-show',
                    persistenceType: 'localStorage',
                }}
                rowKey="id"
                search={{
                    labelWidth: 'auto',
                }}
                pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true
                }}
                scroll={{
                    x: 'max-content'
                }}
                dateFormatter="string"
                headerTitle={t('identity.oidc_client.title')}
                toolBarRender={() => [
                    <Button key="button" type="primary" onClick={() => {
                        setSelectedRowKey(undefined);
                        setOpen(true);
                    }}>
                        {t('actions.new')}
                    </Button>,
                ]}
                rowSelection={{
                    selectedRowKeys: selectedRowKeys,
                    onChange: (selectedRowKeys) => {
                        setSelectedRowKeys(selectedRowKeys as string[]);
                    }
                }}
                tableAlertRender={({
                                       selectedRowKeys,
                                       onCleanSelected,
                                   }) => {
                    return (
                        <Space size={16}>
              <span>
                {t('identity.oidc_client.selected_count', {count: selectedRowKeys.length})}
                  <a style={{marginInlineStart: 8}} onClick={onCleanSelected}>
                  {t('actions.cancel')}
                </a>
              </span>
                        </Space>
                    );
                }}
                tableAlertOptionRender={({selectedRowKeys, onCleanSelected}) => {
                    return (
                        <Space size={16}>
                            <Popconfirm
                                title={t('general.confirm_delete')}
                                onConfirm={async () => {
                                    await deleteItems(selectedRowKeys as string[]);
                                    onCleanSelected();
                                }}
                                okText={t('actions.confirm')}
                                cancelText={t('actions.cancel')}
                            >
                                <Button type="link" size={'small'}>{t('actions.batch_delete')}</Button>
                            </Popconfirm>
                        </Space>
                    );
                }}
            />

            <OidcClientModal
                id={selectedRowKey}
                visible={open}
                onOk={async (values: any) => {
                    await mutation.mutateAsync(values);
                }}
                confirmLoading={mutation.isPending}
                onCancel={() => {
                    setOpen(false);
                    setSelectedRowKey(undefined);
                }}
            />
        </>
    );
};

export default OidcClientPage;
