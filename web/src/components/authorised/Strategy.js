import React, {useState} from 'react';

import {Button, Layout, Popconfirm, Tag} from "antd";
import StrategyModal from "./StrategyModal";
import {ProTable} from "@ant-design/pro-components";
import strategyApi from "../../api/strategy";
import {Link} from "react-router-dom";
import ColumnState, {useColumnState} from "../../hook/column-state";
import {hasMenu} from "../../service/permission";
import Show from "../../dd/fi/show";

const api = strategyApi;
const {Content} = Layout;
const actionRef = React.createRef();

const renderStatus = (text) => {
    if (text === true) {
        return <Tag color={'green'}>开启</Tag>
    } else {
        return <Tag color={'red'}>关闭</Tag>
    }
}

const Strategy = () => {

    let [visible, setVisible] = useState(false);
    let [confirmLoading, setConfirmLoading] = useState(false);
    let [selectedRowKey, setSelectedRowKey] = useState(undefined);

    const [columnsStateMap, setColumnsStateMap] = useColumnState(ColumnState.STRATEGY);

    const columns = [{
        dataIndex: 'index',
        valueType: 'indexBorder',
        width: 48,
    }, {
        title: '名称',
        dataIndex: 'name',
        key: 'name',
        sorter: true,
        render: (text, record) => {
            let view = <div>{text}</div>;
            if(hasMenu('strategy-detail')){
                view = <Link to={`/strategy/${record['id']}`}>{text}</Link>;
            }
            return view;
        },
    }, {
        title: '上传',
        dataIndex: 'upload',
        key: 'upload',
        hideInSearch: true,
        render: (text) => {
            return renderStatus(text);
        }
    }, {
        title: '下载',
        dataIndex: 'download',
        key: 'download',
        hideInSearch: true,
        render: (text) => {
            return renderStatus(text);
        }
    }, {
        title: '编辑',
        dataIndex: 'edit',
        key: 'edit',
        hideInSearch: true,
        render: (text) => {
            return renderStatus(text);
        }
    }, {
        title: '删除',
        dataIndex: 'delete',
        key: 'delete',
        hideInSearch: true,
        render: (text) => {
            return renderStatus(text);
        }
    }, {
        title: '重命名',
        dataIndex: 'rename',
        key: 'rename',
        hideInSearch: true,
        render: (text) => {
            return renderStatus(text);
        }
    }, {
        title: '复制',
        dataIndex: 'copy',
        key: 'copy',
        hideInSearch: true,
        render: (text) => {
            return renderStatus(text);
        }
    }, {
        title: '粘贴',
        dataIndex: 'paste',
        key: 'paste',
        hideInSearch: true,
        render: (text) => {
            return renderStatus(text);
        }
    }, {
        title: '创建时间',
        dataIndex: 'created',
        key: 'created',
        hideInSearch: true,
    },
        {
            title: '操作',
            valueType: 'option',
            key: 'option',
            render: (text, record, _, action) => [
                <Show menu={'strategy-detail'} key={'strategy-get'}>
                    <Link key="get" to={`/strategy/${record['id']}`}>详情</Link>
                </Show>
                ,
                <Show menu={'strategy-edit'} key={'strategy-edit'}>
                    <a
                        key="edit"
                        onClick={() => {
                            setVisible(true);
                            setSelectedRowKey(record['id']);
                        }}
                    >
                        编辑
                    </a>
                </Show>
                ,
                <Show menu={'strategy-del'} key={'strategy-del'}>
                    <Popconfirm
                        key={'confirm-delete'}
                        title="您确认要删除此行吗?"
                        onConfirm={async () => {
                            await api.deleteById(record.id);
                            actionRef.current.reload();
                        }}
                        okText="确认"
                        cancelText="取消"
                    >
                        <a key='delete' className='danger'>删除</a>
                    </Popconfirm>
                </Show>
                ,
            ],
        },
    ];

    return (
        <div>
            <Content className="page-container">

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
                            name: params.name,
                            field: field,
                            order: order
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
                    headerTitle="授权策略"
                    toolBarRender={() => [
                        <Show menu={'strategy-add'}>
                            <Button key="button" type="primary" onClick={() => {
                                setVisible(true)
                            }}>
                                新建
                            </Button>
                        </Show>
                        ,
                    ]}
                />

                <StrategyModal
                    id={selectedRowKey}
                    visible={visible}
                    confirmLoading={confirmLoading}
                    handleCancel={() => {
                        setVisible(false);
                        setSelectedRowKey(undefined);
                    }}
                    handleOk={async (values) => {
                        setConfirmLoading(true);

                        try {
                            let success;
                            if (values['id']) {
                                success = await api.updateById(values['id'], values);
                            } else {
                                success = await api.create(values);
                            }
                            if (success) {
                                setVisible(false);
                            }
                            actionRef.current.reload();
                        } finally {
                            setConfirmLoading(false);
                        }
                    }}
                />
            </Content>
        </div>
    );
}

export default Strategy;
