import React from 'react';
import ColumnState, {useColumnState} from "../../hook/column-state";
import {Button, Layout, message, Popconfirm, Select, Tag, Tooltip} from "antd";
import {ProTable} from "@ant-design/pro-components";
import sessionApi from "../../api/session";
import {MODE_COLORS, PROTOCOL_COLORS} from "../../common/constants";
import {differTime} from "../../utils/utils";
import {openTinyWin} from "../../utils/window";
import Show from "../../dd/fi/show";

const {Content} = Layout;
const actionRef = React.createRef();
const api = sessionApi;

const OnlineSession = () => {

    const [columnsStateMap, setColumnsStateMap] = useColumnState(ColumnState.ONLINE_SESSION);

    const columns = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        }, {
            title: '来源IP',
            dataIndex: 'clientIp',
            key: 'clientIp',
            hideInSearch: true,
        }, {
            title: '接入方式',
            dataIndex: 'mode',
            key: 'mode',
            render: (text) => {
                return (
                    <Tag color={MODE_COLORS[text]}>{text}</Tag>
                )
            },
            hideInSearch: true,
        }, {
            title: '用户昵称',
            dataIndex: 'creatorName',
            key: 'creatorName',
            hideInSearch: true,
        }, {
            title: '资产名称',
            dataIndex: 'assetName',
            key: 'assetName',
            hideInSearch: true,
        }, {
            title: '连接协议',
            dataIndex: 'protocol',
            key: 'protocol',
            render: (text, record) => {
                const title = `${record.username}@${record.ip}:${record.port}`;
                return (
                    <Tooltip title={title}>
                        <Tag color={PROTOCOL_COLORS[text]}>{text}</Tag>
                    </Tooltip>
                )
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
                        <Select.Option value="kubernetes">Kubernetes</Select.Option>
                    </Select>
                );
            },
        }, {
            title: '接入时间',
            dataIndex: 'connectedTime',
            key: 'connectedTime',
            hideInSearch: true,
        }, {
            title: '接入时长',
            dataIndex: 'connectedTimeDur',
            key: 'connectedTimeDur',
            render: (text, record) => {
                if (!record['connectedTime']) {
                    return '-';
                }
                return differTime(new Date(record['connectedTime']), new Date());
            },
            hideInSearch: true,
        },
        {
            title: '操作',
            valueType: 'option',
            key: 'option',
            render: (text, record, _, action) => [
                <Show menu={'online-session-monitor'} key={'online-session-monitor'}>
                    <Button
                        key='monitor'
                        type="link"
                        size='small'
                        onClick={() => {
                            switch (record['mode']) {
                                case 'naive':
                                case 'native':
                                case 'terminal':
                                    openTinyWin(`#/term-monitor?sessionId=${record['id']}`, record['id'], 1024, 768);
                                    break;
                                case 'guacd':
                                    openTinyWin(`#/guacd-monitor?sessionId=${record['id']}`, record['id'], 1024, 768);
                                    break;
                                default:
                                    message.info('数据异常');
                                    break;
                            }
                        }}>
                        监控
                    </Button>
                </Show>,
                <Show menu={'online-session-disconnect'} key={'online-session-disconnect'}>
                    <Popconfirm
                        key={'confirm-disconnect'}
                        title="您确定要断开此会话吗?"
                        onConfirm={async () => {
                            await api.disconnect(record.id);
                            actionRef.current.reload();
                        }}
                        okText="确认"
                        cancelText="取消"
                    >
                        <a key='delete' className='danger'>断开</a>
                    </Popconfirm>
                </Show>,
            ],
        },
    ];

    return (<Content className="page-container">
        <ProTable
            columns={columns}
            actionRef={actionRef}
            columnsState={{
                value: columnsStateMap,
                onChange: setColumnsStateMap
            }}
            request={async (params = {}, sort, filter) => {

                let field = '';
                let order = '';
                if (Object.keys(sort).length > 0) {
                    field = Object.keys(sort)[0];
                    order = Object.values(sort)[0];
                }

                let queryParams = {
                    pageIndex: params.current,
                    pageSize: params.pageSize,
                    protocol: params.protocol,
                    field: field,
                    order: order,
                    status: 'connected'
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
            }}
            dateFormatter="string"
            headerTitle="在线会话列表"
            toolBarRender={() => []}
        />
    </Content>);
};

export default OnlineSession;