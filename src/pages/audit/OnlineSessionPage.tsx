import React, {useRef} from 'react';
import {useTranslation} from "react-i18next";
import {getSort} from "@/utils/sort";
import {ActionType, ProColumns, ProTable} from "@ant-design/pro-components";
import {App, Popconfirm, Select, Typography} from "antd";
import sessionApi, {Session} from "@/api/session-api";
import NButton from "@/components/NButton";
import clsx from "clsx";
import {getProtocolColor} from "@/helper/asset-helper";

const OnlineSessionPage = () => {
    const {t} = useTranslation();
    const actionRef = useRef<ActionType>();

    const {message} = App.useApp();

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
            valueType: 'dateTime'
        }, {
            title: t('audit.connection_duration'),
            dataIndex: 'connectionDuration',
            key: 'connectionDuration',
            hideInSearch: true,
        },
        {
            title: t('actions.option'),
            valueType: 'option',
            key: 'option',
            render: (text, record, _, action) => [
                <NButton
                    key='monitor'
                    onClick={() => {
                        switch (record.protocol) {
                            case 'ssh':
                                window.open(`/terminal-monitor?sessionId=${record.id}`, '_blank')
                                break;
                            case 'rdp':
                            case 'vnc':
                                window.open(`/graphics-monitor?sessionId=${record.id}`, '_blank')
                                break;
                            default:
                                message.warning(t('unknown protocol' + record.protocol));
                        }
                    }}
                >
                    {t('audit.options.monitor')}
                </NButton>,
                <Popconfirm
                    key={'confirm-disconnect'}
                    title={t('audit.options.disconnect.confirm')}
                    onConfirm={async () => {
                        await sessionApi.disconnect(record.id);
                        actionRef.current?.reload();
                    }}
                >
                    <NButton key='delete' danger>{t('audit.options.disconnect.action')}</NButton>
                </Popconfirm>,
            ],
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
                        status: 'connected',
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
                polling={1000}
                dateFormatter="string"
                headerTitle={t('menus.log_audit.submenus.online_session')}
                toolBarRender={() => []}
            />
        </div>
    );
};

export default OnlineSessionPage;