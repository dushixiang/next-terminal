import React from 'react';
import {Badge, Select, Tag, Tooltip} from "antd";
import {ProTable} from "@ant-design/pro-components";
import {PROTOCOL_COLORS} from "../../common/constants";
import strings from "../../utils/strings";
import {useQuery} from "react-query";
import workAssetApi from "../../api/worker/asset";
import dayjs from "dayjs";

const actionRef = React.createRef();

const MyAsset = () => {

    const tagQuery = useQuery('getAllTag', workAssetApi.tags);

    const columns = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: '名称',
            dataIndex: 'name',
            sorter: true,
            render: (text, record) => {
                if (record['description'] === '-') {
                    record['description'] = '';
                }
                return <div>
                    <div>{text}</div>
                    <div style={{
                        color: 'rgba(0, 0, 0, 0.45)',
                        lineHeight: 1.45,
                        fontSize: '14px'
                    }}>{record['description']}</div>
                </div>
            },
        }, {
            title: '协议',
            dataIndex: 'protocol',
            key: 'protocol',
            sorter: true,
            render: (text, record) => {
                return (
                    <Tag color={PROTOCOL_COLORS[text]}>{text}</Tag>
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
            title: '标签',
            dataIndex: 'tags',
            key: 'tags',
            render: tags => {
                if (strings.hasText(tags)) {
                    return tags.split(',').filter(tag => tag !== '-').map(tag => <Tag key={tag}>{tag}</Tag>);
                }
            },
            renderFormItem: (item, {type, defaultRender, ...rest}, form) => {
                if (type === 'form') {
                    return null;
                }

                return (
                    <Select mode="multiple"
                            allowClear>
                        {
                            tagQuery.data?.map(tag => {
                                if (tag === '-') {
                                    return undefined;
                                }
                                return <Select.Option key={tag}>{tag}</Select.Option>
                            })
                        }
                    </Select>
                );
            },
        }, {
            title: '状态',
            dataIndex: 'active',
            key: 'active',
            sorter: true,
            render: (text, record) => {
                if (record['testing'] === true) {
                    return (
                        <Tooltip title='测试中'>
                            <Badge status="processing" text='测试中'/>
                        </Tooltip>
                    )
                }
                if (text) {
                    return (
                        <Tooltip title='运行中'>
                            <Badge status="success" text='运行中'/>
                        </Tooltip>
                    )
                } else {
                    return (
                        <Tooltip title={record['activeMessage']}>
                            <Badge status="error" text='不可用'/>
                        </Tooltip>
                    )
                }
            },
            renderFormItem: (item, {type, defaultRender, ...rest}, form) => {
                if (type === 'form') {
                    return null;
                }

                return (
                    <Select>
                        <Select.Option value="true">运行中</Select.Option>
                        <Select.Option value="false">不可用</Select.Option>
                    </Select>
                );
            },
        },
        {
            title: '最后接入时间',
            key: 'lastAccessTime',
            sorter: true,
            dataIndex: 'lastAccessTime',
            hideInSearch: true,
            render: (text, record) => {
                if (text === '0001-01-01 00:00:00') {
                    return '-';
                }
                return (
                    <Tooltip title={text}>
                        {dayjs(text).fromNow()}
                    </Tooltip>
                )
            },
        },
        {
            title: '操作',
            valueType: 'option',
            key: 'option',
            render: (text, record, index, action) => {
                const id = record['id'];
                const protocol = record['protocol'];
                const name = record['name'];
                let url = '';
                if (protocol === 'ssh') {
                    url = `#/term?assetId=${id}&assetName=${name}&isWorker=true`;
                } else {
                    url = `#/access?assetId=${id}&assetName=${name}&protocol=${protocol}`;
                }

                return [
                    <a
                        key="access"
                        href={url}
                        rel="noreferrer"
                        target='_blank'
                    >
                        接入
                    </a>,
                ]
            },
        },
    ];

    return (
        <div>
            <ProTable
                columns={columns}
                actionRef={actionRef}
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
                        name: params.name,
                        type: params.type,
                        protocol: params.protocol,
                        active: params.active,
                        'tags': params.tags?.join(','),
                        field: field,
                        order: order
                    }
                    let result = await workAssetApi.getPaging(queryParams);

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
                    pageSize: 10,
                }}
                dateFormatter="string"
                headerTitle="资产列表"
            />
        </div>
    );
}

export default MyAsset;