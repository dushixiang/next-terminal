import React, {useRef, useState} from 'react';
import {ActionType, ProColumns, ProTable} from "@ant-design/pro-components";
import {App, Badge, Button, Popconfirm, Tooltip} from "antd";
import {useTranslation} from "react-i18next";
import {useMutation} from "@tanstack/react-query";
import agentGatewayApi, {AgentGateway} from "@/src/api/agent-gateway-api";
import AgentGatewayModal from "@/src/pages/gateway/AgentGatewayModal";
import AgentGatewayRegister from "@/src/pages/gateway/AgentGatewayRegister";
import NButton from "@/src/components/NButton";
import {useLicense} from "@/src/hook/use-license";
import Disabled from "@/src/components/Disabled";

const api = agentGatewayApi;

const AgentGatewayPage = () => {

    const {t} = useTranslation();
    const actionRef = useRef<ActionType>();

    let [open, setOpen] = useState<boolean>(false);
    let [registerOpen, setRegisterOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>();
    let [license] = useLicense();

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

    let columns: ProColumns<AgentGateway>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('gateways.name'),
            dataIndex: 'name',
        },
        {
            title: 'IP',
            dataIndex: 'ip',
            key: 'ip',
            sorter: true,
            hideInSearch: true
        },
        {
            title: t('gateways.os'),
            dataIndex: 'os',
            key: 'os',
            hideInSearch: true
        },
        {
            title: t('gateways.arch'),
            dataIndex: 'arch',
            key: 'arch',
            hideInSearch: true
        },
        {
            title: t('gateways.status'),
            dataIndex: 'status',
            key: 'status',
            hideInSearch: true,
            render: (text, record) => {
                switch (text) {
                    case "connected":
                        return (
                            <Tooltip title={record.statusMessage}>
                                <Badge status="success" text={t('gateways.connected')}/>
                            </Tooltip>
                        )
                    case "disconnected":
                        return (
                            <Tooltip title={record.statusMessage}>
                                <Badge status="default" text={t('gateways.disconnected')}/>
                            </Tooltip>
                        )
                }
            }
        },
        {
            title: t('gateways.version'),
            key: 'version',
            dataIndex: 'version',
            hideInSearch: true,
        },
        {
            title: t('general.created_at'),
            key: 'createdAt',
            dataIndex: 'createdAt',
            hideInSearch: true,
            valueType: 'dateTime'
        },
        {
            title: t('general.updated_at'),
            key: 'updatedAt',
            dataIndex: 'updatedAt',
            hideInSearch: true,
            valueType: 'fromNow'
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
                    headerTitle={t('menus.gateway.submenus.agent_gateway')}
                    toolBarRender={() => [
                        <Button key="button" type="primary" onClick={() => {
                            setRegisterOpen(true)
                        }}>
                            {t('actions.new')}
                        </Button>
                    ]}
                />

                <AgentGatewayModal
                    id={selectedRowKey}
                    open={open}
                    confirmLoading={mutation.isPending}
                    handleCancel={() => {
                        setOpen(false);
                        setSelectedRowKey(undefined);
                    }}
                    handleOk={mutation.mutate}
                />

                <AgentGatewayRegister
                    open={registerOpen}
                    handleCancel={() => {
                        setRegisterOpen(false);
                    }}
                />
            </Disabled>
        </div>
    );
};

export default AgentGatewayPage;