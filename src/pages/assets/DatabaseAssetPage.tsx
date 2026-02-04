import React, {useRef, useState} from 'react';
import {App, Button, Popconfirm, Tag} from "antd";
import {ActionType, ProColumns, ProTable} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {useMutation} from "@tanstack/react-query";
import databaseAssetApi, {DatabaseAsset} from "@/api/database-asset-api";
import DatabaseAssetModal from "@/pages/assets/DatabaseAssetModal";
import NButton from "@/components/NButton";
import {getSort} from "@/utils/sort";

const api = databaseAssetApi;

const DatabaseAssetPage = () => {
    const {t} = useTranslation();
    const actionRef = useRef<ActionType>(null);
    const {message} = App.useApp();

    const [open, setOpen] = useState(false);
    const [selectedRowKey, setSelectedRowKey] = useState<string>();

    const postOrUpdate = async (values: any) => {
        if (values['id']) {
            await api.updateById(values['id'], values);
        } else {
            await api.create(values);
        }
    };

    const mutation = useMutation({
        mutationFn: postOrUpdate,
        onSuccess: () => {
            actionRef.current?.reload();
            setOpen(false);
            setSelectedRowKey(undefined);
            message.success(t('general.success'));
        }
    });

    const columns: ProColumns<DatabaseAsset>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('general.name'),
            dataIndex: 'name',
            ellipsis: true,
        },
        {
            title: t('db.asset.type'),
            dataIndex: 'type',
            render: (text) => {
                if (text === 'mysql') {
                    return <Tag color="blue">{t('db.asset.type_mysql')}</Tag>;
                }
                if (text === 'pg') {
                    return <Tag color="purple">{t('db.asset.type_pg')}</Tag>;
                }
                return <Tag>{text}</Tag>;
            },
            valueEnum: {
                mysql: {text: t('db.asset.type_mysql')},
                pg: {text: t('db.asset.type_pg')},
            },
            width: 120,
        },
        {
            title: t('db.asset.host'),
            dataIndex: 'host',
            render: (_, record) => `${record.host}:${record.port}`,
            hideInSearch: true,
        },
        {
            title: t('menus.identity.submenus.user'),
            dataIndex: 'username',
            hideInSearch: true,
        },
        {
            title: t('assets.gateway_type'),
            dataIndex: 'gatewayType',
            hideInSearch: true,
            render: (text) => {
                if (!text) {
                    return '-';
                }
                if (text === 'ssh') {
                    return t('menus.gateway.submenus.ssh_gateway');
                }
                if (text === 'agent') {
                    return t('menus.gateway.submenus.agent_gateway');
                }
                if (text === 'group') {
                    return t('menus.gateway.submenus.gateway_group');
                }
                return text;
            },
        },
        {
            title: t('assets.tags'),
            dataIndex: 'tags',
            hideInSearch: true,
            render: (tags) => {
                if (!tags || tags === '-') {
                    return '-';
                }
                return (
                    <>
                        {(tags as string[]).map(tag => (
                            <Tag key={tag}>{tag}</Tag>
                        ))}
                    </>
                );
            },
        },
        {
            title: t('general.status'),
            dataIndex: 'status',
            render: (text, record) => {
                if (text === 'active') {
                    return <Tag color="success">{t('assets.active')}</Tag>;
                }
                if (text === 'inactive') {
                    return <Tag color="error">{t('general.offline')}</Tag>;
                }
                if (text === 'checking') {
                    return <Tag color="processing">{t('assets.conn_test')}</Tag>;
                }
                return <Tag>{text}</Tag>;
            },
            valueEnum: {
                active: {text: t('assets.active')},
                inactive: {text: t('general.offline')},
                checking: {text: t('assets.conn_test')},
            },
            width: 120,
        },
        {
            title: t('general.created_at'),
            dataIndex: 'createdAt',
            valueType: 'dateTime',
            sorter: true,
            hideInSearch: true,
            width: 190,
        },
        {
            title: t('actions.label'),
            valueType: 'option',
            key: 'option',
            width: 120,
            render: (text, record) => [
                <NButton
                    key="edit"
                    onClick={() => {
                        setOpen(true);
                        setSelectedRowKey(record.id);
                    }}
                >
                    {t('actions.edit')}
                </NButton>,
                <Popconfirm
                    key={'delete_confirm'}
                    title={t('general.confirm_delete')}
                    onConfirm={async () => {
                        await api.deleteById(record.id);
                        actionRef.current?.reload();
                    }}
                >
                    <NButton key='delete' danger={true}>{t('actions.delete')}</NButton>
                </Popconfirm>,
            ],
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
                        keyword: params.keyword,
                        name: params.name,
                        type: params.type,
                        status: params.status,
                    };
                    const result = await api.getPaging(queryParams);
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
                headerTitle={t('menus.resource.submenus.database_asset')}
                toolBarRender={() => [
                    <Button key="button" type="primary" onClick={() => setOpen(true)}>
                        {t('actions.new')}
                    </Button>,
                ]}
            />

            <DatabaseAssetModal
                id={selectedRowKey}
                open={open}
                confirmLoading={mutation.isPending}
                handleCancel={() => {
                    setOpen(false);
                    setSelectedRowKey(undefined);
                }}
                handleOk={mutation.mutate}
            />
        </div>
    );
};

export default DatabaseAssetPage;
