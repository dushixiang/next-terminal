import React, {useRef, useState} from 'react';
import {useTranslation} from "react-i18next";
import {getSort} from "@/utils/sort";
import {ActionType, ProColumns, ProTable} from "@ant-design/pro-components";
import {App, Button, Drawer, Popconfirm, Select, Space, Table, Typography} from "antd";
import sessionApi, {Session} from "@/api/session-api";
import {renderSize} from "@/utils/utils";
import SessionCommandPage from "@/pages/audit/SessionCommandPage";
import NButton from "@/components/NButton";
import {useMutation} from "@tanstack/react-query";
import clsx from "clsx";
import {getProtocolColor} from "@/helper/asset-helper";


const OfflineSessionPage = () => {
    const {t} = useTranslation();
    const actionRef = useRef<ActionType>();

    let [selectedRowKey, setSelectedRowKey] = useState('');
    let [sessionCommandOpen, setSessionCommandOpen] = useState(false);

    const {message, modal} = App.useApp();

    let batchDeleteMutation = useMutation({
        mutationFn: sessionApi.deleteById,
        onSuccess: () => {
            actionRef.current?.reload();
        }
    });

    let clearMutation = useMutation({
        mutationFn: sessionApi.clear,
        onSuccess: () => {
            actionRef.current?.reload();
        }
    });

    const columns: ProColumns<Session>[] = [
        {
            title: t('audit.user'),
            dataIndex: 'userAccount',
            key: 'userAccount',
        },
        {
            title: t('audit.asset'),
            dataIndex: 'assetName',
            key: 'assetName',
            render: (text, record) => {
                let view = <div>{text}</div>;
                const title = `${record['protocol']} ${record.username}@${record.ip}:${record.port}`;
                return <div>
                    {view}
                    <Typography.Text type="secondary">{title}</Typography.Text>
                </div>
            },
        },
        {
            title: t('audit.client_ip'),
            dataIndex: 'clientIp',
            key: 'clientIp',
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
            title: t('audit.protocol'),
            dataIndex: 'protocol',
            key: 'protocol',
            sorter: true,
            render: (text, record) => {
                return <span
                    className={clsx('rounded-md px-1.5 py-1 text-white font-bold', getProtocolColor(record.protocol))}
                    style={{fontSize: 9,}}>
                        {record.protocol.toUpperCase()}
                    </span>
            },
            renderFormItem: (item, {type, defaultRender, ...rest}, form) => {
                if (type === 'form') {
                    return null;
                }

                return (
                    <Select>
                        <Select.Option value="rdp">RDP</Select.Option>
                        <Select.Option value="ssh">SSH</Select.Option>
                        <Select.Option value="telnet">Telnet</Select.Option>
                        <Select.Option value="vnc">VNC</Select.Option>
                        <Select.Option value="kubernetes">Kubernetes</Select.Option>
                    </Select>
                );
            },
        },

        {
            title: t('audit.connected_at'),
            dataIndex: 'connectedAt',
            key: 'connectedAt',
            hideInSearch: true,
            valueType: "dateTime"
        }, {
            title: t('audit.connection_duration'),
            dataIndex: 'connectionDuration',
            key: 'connectionDuration',
            hideInSearch: true,
        }, {
            title: t('audit.recording_size'),
            dataIndex: 'recordingSize',
            key: 'recordingSize',
            render: (text, record) => {
                return renderSize(record['recordingSize']);
            },
            hideInSearch: true,
        },
        {
            title: t('actions.option'),
            valueType: 'option',
            key: 'option',
            render: (text, record, _, action) => {
                let disablePlayback = record.recordingSize <= 0;
                let disableCmdRecord = record['commandCount'] === 0;
                return [
                    <Button
                        key='monitor'
                        disabled={disablePlayback}
                        type="link"
                        size='small'
                        onClick={() => {
                            switch (record.protocol) {
                                case 'ssh':
                                case 'telnet':
                                    window.open(`/terminal-playback?sessionId=${record['id']}`, '_blank')
                                    break;
                                case 'rdp':
                                case 'vnc':
                                    window.open(`/graphics-playback?sessionId=${record['id']}`, '_blank')
                                    break;
                                default:
                                    message.warning(t('unknown protocol ' + record.protocol));
                            }
                        }}>
                        {t('audit.options.playback')}
                    </Button>,
                    <Button
                        key='command'
                        disabled={disableCmdRecord}
                        type="link"
                        size='small'
                        onClick={() => {
                            setSelectedRowKey(record.id);
                            setSessionCommandOpen(true);
                        }}>
                        {t('audit.command')}({record['commandCount']})
                    </Button>,
                    <Popconfirm
                        key={'delete-confirm'}
                        title={t('general.delete_confirm')}
                        onConfirm={async () => {
                            await sessionApi.deleteById(record.id);
                            actionRef.current?.reload();
                        }}
                    >
                        <NButton key='delete' danger={true}>{t('actions.delete')}</NButton>
                    </Popconfirm>,
                ]
            },
        },
    ];

    return (
        <div>
            <ProTable
                defaultSize={'small'}
                columns={columns}
                actionRef={actionRef}
                    request={async (params = {}, sort, filter) => {
                        let [sortOrder, sortField] = getSort(sort);
                        
                        let queryParams = {
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        sortOrder: sortOrder,
                        sortField: sortField,
                        status: 'disconnected',
                        clientIp: params.clientIp,
                        protocol: params.protocol,
                        assetName: params.assetName,
                        userAccount: params.userAccount,
                    }
                    let result = await sessionApi.getPaging(queryParams);
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
                headerTitle={t('menus.log_audit.submenus.offline_session')}
                rowSelection={{
                    selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT],
                }}
                tableAlertOptionRender={({selectedRowKeys}) => {
                    return (
                        <Space size={16}>
                            <NButton
                                danger={true}
                                loading={batchDeleteMutation.isPending}
                                onClick={async () => {
                                    batchDeleteMutation.mutate(selectedRowKeys.join(','))
                                }}
                            >{t('actions.delete')}
                            </NButton>
                        </Space>
                    );
                }}
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

            <Drawer title={t('audit.command')}
                    placement="right"
                    width={window.innerWidth * 0.9}
                    onClose={() => {
                        setSelectedRowKey('');
                        setSessionCommandOpen(false);
                    }}
                    open={sessionCommandOpen}
            >
                <SessionCommandPage
                    open={sessionCommandOpen}
                    sessionId={selectedRowKey}
                />
            </Drawer>
        </div>
    );
};

export default OfflineSessionPage;