import React, {useRef, useState} from 'react';
import {App, Button, Popconfirm, Tag} from 'antd';
import type {ActionType, ProColumns} from '@ant-design/pro-components';
import {ProTable} from '@ant-design/pro-components';
import {PlusOutlined} from '@ant-design/icons';
import {useTranslation} from 'react-i18next';
import gatewayGroupApi, {GatewayGroup} from '@/api/gateway-group-api';
import GatewayGroupDrawer from './GatewayGroupDrawer';

const GatewayGroupPage: React.FC = () => {
    const {t} = useTranslation();
    const {message} = App.useApp();
    const actionRef = useRef<ActionType>(null);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [currentGroup, setCurrentGroup] = useState<GatewayGroup | undefined>();

    const handleCreate = () => {
        setCurrentGroup(undefined);
        setDrawerOpen(true);
    };

    const handleEdit = (record: GatewayGroup) => {
        setCurrentGroup(record);
        setDrawerOpen(true);
    };

    const handleDelete = async (id: string) => {
        try {
            await gatewayGroupApi.deleteById(id);
            message.success(t('general.success'));
            actionRef.current?.reload();
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const handleDrawerClose = (success?: boolean) => {
        setDrawerOpen(false);
        setCurrentGroup(undefined);
        if (success) {
            actionRef.current?.reload();
        }
    };

    const columns: ProColumns<GatewayGroup>[] = [
        {
            title: t('gateway_group.name'),
            dataIndex: 'name',
            hideInSearch: true,
            width: 200,
        },
        {
            title: t('gateway_group.selection_mode'),
            dataIndex: 'selectionMode',
            width: 120,
            render: (_, record) => {
                const modeMap: Record<string, { text: string; color: string }> = {
                    priority: {text: t('gateway_group.mode_priority'), color: 'blue'},
                    latency: {text: t('gateway_group.mode_latency'), color: 'green'},
                    random: {text: t('gateway_group.mode_random'), color: 'orange'},
                };
                const mode = modeMap[record.selectionMode] || {text: record.selectionMode, color: 'default'};
                return <Tag color={mode.color}>{mode.text}</Tag>;
            },
        },
        {
            title: t('gateway_group.members'),
            dataIndex: 'members',
            width: 100,
            render: (_, record) => {
                const enabledCount = record.members?.filter(m => m.enabled).length || 0;
                const totalCount = record.members?.length || 0;
                return `${enabledCount}/${totalCount}`;
            },
        },
        {
            title: t('general.description'),
            dataIndex: 'description',
            hideInSearch: true,
            ellipsis: true,
        },
        {
            title: t('general.created_at'),
            dataIndex: 'createdAt',
            width: 180,
            valueType: 'dateTime',
            hideInSearch: true,
        },
        {
            title: t('actions.label'),
            width: 150,
            fixed: 'right',
            valueType: 'option',
            render: (_, record) => [
                <Button
                    key="edit"
                    type="link"
                    size="small"
                    onClick={() => handleEdit(record)}
                >
                    {t('actions.edit')}
                </Button>,
                <Popconfirm
                    key="delete"
                    title={t('general.confirm_delete')}
                    onConfirm={() => handleDelete(record.id)}
                >
                    <Button type="link" size="small" danger>
                        {t('actions.delete')}
                    </Button>
                </Popconfirm>,
            ],
        },
    ];

    return (
        <>
            <ProTable<GatewayGroup>
                columns={columns}
                actionRef={actionRef}
                request={async (params) => {
                    const result = await gatewayGroupApi.getPaging({
                        pageIndex: params.current || 1,
                        pageSize: params.pageSize || 10,
                        keyword: params.keyword,
                    });
                    return {
                        data: result.items,
                        success: true,
                        total: result.total,
                    };
                }}
                rowKey="id"
                headerTitle={t('menus.gateway.submenus.gateway_group')}
                options={{
                    search: true,
                }}
                search={false}
                pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true,
                }}
                toolBarRender={() => [
                    <Button
                        key="create"
                        type="primary"
                        icon={<PlusOutlined/>}
                        onClick={handleCreate}
                    >
                        {t('actions.new')}
                    </Button>,
                ]}
            />

            <GatewayGroupDrawer
                open={drawerOpen}
                group={currentGroup}
                onClose={handleDrawerClose}
            />
        </>
    );
};

export default GatewayGroupPage;
