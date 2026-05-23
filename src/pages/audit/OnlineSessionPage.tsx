import React, {useRef} from 'react';
import {useTranslation} from "react-i18next";
import {getSort} from "@/utils/sort";
import NTable, {type NTableActionType, type NColumn} from "@/components/NTable";
import {App, Popconfirm, Space, Typography} from "antd";
import sessionApi, {Session} from "@/api/session-api";
import NButton from "@/components/NButton";
import clsx from "clsx";
import {getProtocolColor} from "@/helper/asset-helper";

const OnlineSessionPage = () => {
    const {t} = useTranslation();
    const actionRef = useRef<NTableActionType>(null);

    const {message} = App.useApp();

    const columns: NColumn<Session>[] = [
        {
            title: t('menus.identity.submenus.user'),
            dataIndex: 'userAccount',
            key: 'userAccount',
        },
        {
            title: t('menus.resource.submenus.asset'),
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
            title: t('assets.protocol'),
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
            title: t('actions.label'),
            valueType: 'option',
            key: 'option',
            render: (text, record) => (
                <Space>
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
                                    message.warning(t('audit.unknown_protocol', {protocol: record.protocol}));
                            }
                        }}
                    >
                        {t('gateways.monitor.action')}
                    </NButton>
                    <Popconfirm
                        key={'confirm-disconnect'}
                        title={t('audit.options.disconnect.confirm')}
                        onConfirm={async () => {
                            await sessionApi.disconnect(record.id);
                            actionRef.current?.reload();
                        }}
                    >
                        <NButton key='delete' danger>{t('audit.options.disconnect.action')}</NButton>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <NTable
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
                        keyword: params.keyword,
                    }
                    let result = await sessionApi.getPaging(queryParams);
                    return {
                        data: result['items'],
                        success: true,
                        total: result['total']
                    };
                }}
                rowKey="id"
                options={{
                    search: true,
                }}
                search={false}
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
