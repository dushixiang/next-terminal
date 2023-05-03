import React, {useState} from 'react';
import {Badge, Modal, Select, Space, Table, Tag, Tooltip, Typography} from "antd";
import {PROTOCOL_COLORS} from "../../common/constants";
import {isEmpty} from "../../utils/utils";
import dayjs from "dayjs";
import {ProTable} from "@ant-design/pro-components";
import assetApi from "../../api/asset";
import strings from "../../utils/strings";
import {useQuery} from "react-query";
import tagApi from "../../api/tag";

const {Title} = Typography;

const actionRef = React.createRef();

const SelectingAsset = ({
                            visible,
                            handleOk,
                            handleCancel,
                            confirmLoading,
                            id,
                        }) => {

    let [rows, setRows] = useState([]);
    const tagQuery = useQuery('getAllTag', tagApi.getAll);

    const addRows = (selectedRows) => {
        selectedRows.forEach(selectedRow => {
            let exist = rows.some(row => {
                return row.id === selectedRow.id;
            });
            if (exist === false) {
                rows.push(selectedRow);
            }
        });
        setRows(rows.slice());
    }

    const removeRows = (selectedRows) => {
        selectedRows.forEach(selectedRow => {
            rows = rows.filter(row => row.id !== selectedRow.id);
        });
        setRows(rows.slice());
    }

    const removeRow = (rowKey) => {
        let items = rows.filter(row => row.id !== rowKey);
        setRows(items.slice());
    }

    const columns = [{
        title: '资产名称',
        dataIndex: 'name',
        key: 'name',
        render: (name, record) => {
            let short = name;
            if (short && short.length > 20) {
                short = short.substring(0, 20) + " ...";
            }
            return (
                <Tooltip placement="topLeft" title={name}>
                    {short}
                </Tooltip>
            );
        }
    }, {
        title: '连接协议',
        dataIndex: 'protocol',
        key: 'protocol',
        render: (text, record) => {
            const title = `${record['ip'] + ':' + record['port']}`
            return (
                <Tooltip title={title}>
                    <Tag color={PROTOCOL_COLORS[text]}>{text}</Tag>
                </Tooltip>
            )
        }
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
        render: text => {

            if (text) {
                return (
                    <Tooltip title='运行中'>
                        <Badge status="processing" text='运行中'/>
                    </Tooltip>
                )
            } else {
                return (
                    <Tooltip title='不可用'>
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
    }, {
        title: '所有者',
        dataIndex: 'ownerName',
        key: 'ownerName',
        hideInSearch: true,
    }, {
        title: '创建时间',
        dataIndex: 'created',
        key: 'created',
        hideInSearch: true,
        render: (text, record) => {
            return (
                <Tooltip title={text}>
                    {dayjs(text).fromNow()}
                </Tooltip>
            )
        }
    },
    ];

    return (
        <div>
            <Modal
                title="选择资产"
                visible={visible}
                width={window.innerWidth * 0.8}
                centered={true}
                onOk={() => {
                    handleOk(rows);
                }}
                onCancel={handleCancel}
            >
                <div style={{paddingLeft: 24, paddingRight: 24}}>
                    <Title level={5}>待执行资产列表</Title>
                    <div>
                        {
                            rows.map(item => {
                                return <Tag color={PROTOCOL_COLORS[item['protocol']]} closable
                                            onClose={() => removeRow(item['id'])}
                                            key={item['id']}>{item['name']}</Tag>
                            })
                        }
                    </div>
                </div>

                <ProTable
                    columns={columns}
                    actionRef={actionRef}
                    rowSelection={{
                        // 自定义选择项参考: https://ant.design/components/table-cn/#components-table-demo-row-selection-custom
                        // 注释该行则默认不显示下拉选项
                        selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT],
                    }}
                    tableAlertRender={({selectedRowKeys, selectedRows, onCleanSelected}) => (
                        <Space size={24}>
                              <span>
                                已选 {selectedRowKeys.length} 项
                              </span>
                            <span>
                                <a onClick={() => addRows(selectedRows)}>
                                  加入待执行列表
                                </a>
                            </span>
                            <span>
                                <a onClick={() => removeRows(selectedRows)}>
                                  从待执行列表移除
                                </a>
                            </span>
                        </Space>
                    )}
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
                            protocol: 'ssh',
                            active: params.active,
                            'tags': params.tags?.join(','),
                            field: field,
                            order: order
                        }
                        let result = await assetApi.getPaging(queryParams);
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
                        pageSize: 5,
                    }}
                    dateFormatter="string"
                    headerTitle="资产列表"
                />
            </Modal>
        </div>
    );
};

export default SelectingAsset;