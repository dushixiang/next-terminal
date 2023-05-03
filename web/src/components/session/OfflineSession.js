import React, {useState} from 'react';
import {Button, Drawer, Layout, message, Modal, Popconfirm, Select, Table, Tag, Tooltip} from "antd";
import {ProTable} from "@ant-design/pro-components";
import ColumnState, {useColumnState} from "../../hook/column-state";

import {differTime} from "../../utils/utils";
import {openTinyWin} from "../../utils/window";
import {MODE_COLORS, PROTOCOL_COLORS} from "../../common/constants";
import sessionApi from "../../api/session";
import './OfflineSession.css'
import Show from "../../dd/fi/show";
import {useQuery} from "react-query";
import userApi from "../../api/user";
import assetApi from "../../api/asset";

const {Content} = Layout;
const actionRef = React.createRef();
const api = sessionApi;

const OfflineSession = () => {

    const [columnsStateMap, setColumnsStateMap] = useColumnState(ColumnState.OFFLINE_SESSION);

    let [selectedRowKeys, setSelectedRowKeys] = useState([]);

    let userQuery = useQuery('userQuery', userApi.getAll);
    let assetQuery = useQuery('assetQuery', assetApi.getAll);

    const userOptions = userQuery.data?.map(item=>{
        return {
            label: item.nickname,
            value: item.id
        }
    })

    const assetOptions = assetQuery.data?.map(item=>{
        return {
            label: item.name,
            value: item.id
        }
    })

    const columns = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        }, {
            title: '来源IP',
            dataIndex: 'clientIp',
            key: 'clientIp',
        }, {
            title: '用户昵称',
            dataIndex: 'creatorName',
            key: 'creatorName',
            renderFormItem: (item, {type, defaultRender, ...rest}, form) => {
                if (type === 'form') {
                    return null;
                }

                return (
                    <Select showSearch
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            allowClear
                            options={userOptions}
                    >

                    </Select>
                );
            },
        }, {
            title: '资产名称',
            dataIndex: 'assetName',
            key: 'assetName',
            renderFormItem: (item, {type, defaultRender, ...rest}, form) => {
                if (type === 'form') {
                    return null;
                }

                return (
                    <Select showSearch
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            allowClear
                            options={assetOptions}>
                    </Select>
                );
            },
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
                return differTime(new Date(record['connectedTime']), new Date(record['disconnectedTime']));
            },
            hideInSearch: true,
        },
        {
            title: '操作',
            valueType: 'option',
            key: 'option',
            render: (text, record, _, action) => {
                let disablePlayback = record['recording'] !== '1';
                let disableCmdRecord = record['commandCount'] === 0;
                return [
                    <Show menu={'offline-session-playback'} key={'offline-session-playback'}>
                        <Button
                            key='monitor'
                            disabled={disablePlayback}
                            type="link"
                            size='small'
                            onClick={() => {
                                switch (record['mode']) {
                                    case 'naive':
                                    case 'native':
                                    case 'terminal':
                                        openTinyWin(`#/term-playback?sessionId=${record['id']}`, record['id'], 1024, 520);
                                        break;
                                    case 'guacd':
                                        openTinyWin(`#/guacd-playback?sessionId=${record['id']}`, record['id'], 1024, 768);
                                        break;
                                    default:
                                        message.info('数据异常');
                                        break;
                                }
                            }}>
                            回放
                        </Button>
                    </Show>,
                    <Show menu={'offline-session-del'} key={'offline-session-del'}>
                        <Popconfirm
                            key={'confirm-delete'}
                            title="您确定要删除此会话吗?"
                            onConfirm={async () => {
                                await api.deleteById(record.id);
                                actionRef.current.reload();
                            }}
                            okText="确认"
                            cancelText="取消"
                        >
                            <a key='delete' className='danger'>删除</a>
                        </Popconfirm>
                    </Show>,
                ]
            },
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
                    clientIp: params.clientIp,
                    userId: params.creatorName,
                    assetId: params.assetName,
                    field: field,
                    order: order,
                    status: 'disconnected',
                }
                let result = await api.getPaging(queryParams);
                return {
                    data: result['items'],
                    success: true,
                    total: result['total']
                };
            }}
            rowKey="id"
            rowClassName={(record, index) => {
                return record['reviewed'] ? '' : 'unreviewed';
            }}
            rowSelection={{
                // 自定义选择项参考: https://ant.design/components/table-cn/#components-table-demo-row-selection-custom
                // 注释该行则默认不显示下拉选项
                selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT],
                selectedRowKeys: selectedRowKeys,
                onChange: (keys) => {
                    setSelectedRowKeys(keys);
                }
            }}
            search={{
                labelWidth: 'auto',
            }}
            pagination={{
                defaultPageSize: 10,
                showSizeChanger: true
            }}
            dateFormatter="string"
            headerTitle="离线会话列表"
            toolBarRender={() => [
                <Show menu={'offline-session-del'}>
                    <Button key="delete" danger
                            type="primary"
                            disabled={selectedRowKeys.length === 0}
                            onClick={() => {
                                Modal.confirm({
                                    title: '您确定要删除选中的行吗?',
                                    content: '删除之后无法进行恢复，请慎重考虑。',
                                    okText: '确定',
                                    okType: 'danger',
                                    cancelText: '取消',
                                    onOk: async () => {
                                        await api.deleteById(selectedRowKeys.join(","));
                                        actionRef.current.reload();
                                        setSelectedRowKeys([]);
                                    }
                                });
                            }}>
                        删除
                    </Button>
                </Show>,
                <Show menu={'offline-session-clear'}>
                    <Button key="clear" danger
                            type="primary"
                            onClick={() => {
                                Modal.confirm({
                                    title: '您确定要清空全部会话吗?',
                                    content: '清空之后无法进行恢复，请慎重考虑。',
                                    okText: '确定',
                                    okType: 'danger',
                                    cancelText: '取消',
                                    onOk: async () => {
                                        await api.clear();
                                        actionRef.current.reload();
                                        setSelectedRowKeys([]);
                                    }
                                });
                            }}>
                        清空
                    </Button>
                </Show>,
            ]}
        />
    </Content>);
};

export default OfflineSession;