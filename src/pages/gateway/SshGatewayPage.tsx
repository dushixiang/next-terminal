import React, {useRef, useState} from 'react';
import {ActionType, ProColumns, ProTable} from "@ant-design/pro-components";
import {App, Badge, Button, Popconfirm, Tag, Tooltip} from "antd";
import {useTranslation} from "react-i18next";
import {getSort} from "@/utils/sort";
import {useMutation} from "@tanstack/react-query";
import sshGatewayApi, {SSHGateway} from "@/api/ssh-gateway-api";
import SshGatewayModal from "@/pages/gateway/SshGatewayModal";
import NButton from "@/components/NButton";

const api = sshGatewayApi;

const SshGatewayPage = () => {

    const {t} = useTranslation();
    const actionRef = useRef<ActionType>();

    let [open, setOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>();

    const {message} = App.useApp();

    const postOrUpdate = async (values: any) => {
        if (values['id']) {
            await api.updateById(values['id'], values);
        } else {
            await api.create(values);
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

    function showSuccess() {
        message.open({
            type: 'success',
            content: t('general.success'),
        });
    }

    let columns: ProColumns<SSHGateway>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('general.name'),
            dataIndex: 'name',
        },
        {
            title: 'IP',
            dataIndex: 'ip',
            key: 'ip',
            sorter: true,
            hideInSearch: true
        }, {
            title: t('gateways.port'),
            dataIndex: 'port',
            key: 'port',
            hideInSearch: true
        }, {
            title: t('assets.account_type'),
            dataIndex: 'accountType',
            key: 'accountType',
            hideInSearch: true,
            render: (accountType) => {
                switch (accountType) {
                    case 'password':
                        return <Tag color="red">{t('assets.password')}</Tag>
                    case 'private-key':
                        return <Tag color="green">{t('assets.private_key')}</Tag>
                    case 'credential':
                        return <Tag color={'orange'}>{t('assets.credential')}</Tag>
                }
            }
        }, {
            title: t('gateways.username'),
            dataIndex: 'username',
            key: 'username',
            hideInSearch: true
        },
        {
            title: t('gateways.status'),
            dataIndex: 'status',
            key: 'status',
            hideInSearch: true,
            render: (text, record) => {
                switch (text) {
                    case "disconnected":
                        return <Badge status="default" text={t('gateways.ssh_status.disconnected')}/>
                    case "connecting":
                        return <Badge status="processing" text={t('gateways.ssh_status.connecting')}/>
                    case "connected":
                        return <Badge status="success" text={t('gateways.ssh_status.connected')}/>
                    case "error":
                        return (
                            <Tooltip title={record.statusMessage}>
                                <Badge status="error" text={t('gateways.ssh_status.error')}/>
                            </Tooltip>
                        )
                }
            }
        },
        {
            title: t('general.created_at'),
            key: 'createdAt',
            dataIndex: 'createdAt',
            hideInSearch: true,
            valueType: 'dateTime'
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
                </NButton>,
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
            ],
        },
    ];

    return (
        <div>
            <ProTable
                columns={columns}
                actionRef={actionRef}
                request={async (params = {}, sort, filter) => {
                    let [sortOrder, sortField] = getSort(sort);
                    
                    let queryParams = {
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        sortOrder: sortOrder,
                        sortField: sortField,
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
                headerTitle={t('menus.gateway.submenus.ssh_gateway')}
                toolBarRender={() => [
                    <Button key="button" type="primary" onClick={() => {
                        setOpen(true)
                    }}>
                        {t('actions.new')}
                    </Button>
                ]}
            />

            <SshGatewayModal
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

export default SshGatewayPage;