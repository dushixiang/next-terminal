import React, {useState} from 'react';

import {Button, Layout, Popconfirm} from "antd";
import {Link} from "react-router-dom";
import {ProTable} from "@ant-design/pro-components";
import roleApi from "../../api/role";
import RoleModal from "./RoleModal";
import ColumnState, {useColumnState} from "../../hook/column-state";
import {hasMenu} from "../../service/permission";
import Show from "../../dd/fi/show";

const api = roleApi;
const {Content} = Layout;

const actionRef = React.createRef();

const Role = () => {

    let [visible, setVisible] = useState(false);
    let [confirmLoading, setConfirmLoading] = useState(false);
    let [selectedRowKey, setSelectedRowKey] = useState(undefined);

    const [columnsStateMap, setColumnsStateMap] = useColumnState(ColumnState.ROLE);

    const columns = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: '名称',
            dataIndex: 'name',
            render: (text, record) => {
                let view = <div>{text}</div>;
                if (hasMenu('role-detail')) {
                    view = <Link to={`/role/${record['id']}`}>{text}</Link>;
                }
                return view;
            },
        },
        {
            title: '类型',
            dataIndex: 'type',
            valueType: 'radio',
            sorter: true,
            valueEnum: {
                'default': {text: '内置角色'},
                'new': {text: '用户添加'},
            },
        },
        {
            title: '创建时间',
            key: 'created',
            dataIndex: 'created',
            hideInSearch: true,
        },
        {
            title: '操作',
            valueType: 'option',
            key: 'option',
            render: (text, record, _, action) => [
                <Show menu={'role-detail'} key={'role-get'}>
                    <Link key="get" to={`/role/${record['id']}`}>详情</Link>
                </Show>
                ,
                <Show menu={'role-edit'} key={'role-edit'}>
                    <a
                        key="edit"
                        disabled={!record['modifiable']}
                        onClick={() => {
                            setVisible(true);
                            setSelectedRowKey(record['id']);
                        }}
                    >
                        编辑
                    </a>
                </Show>
                ,
                <Show menu={'role-del'} key={'role-del'}>
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
                        <a key='delete' disabled={!record['deletable']} className='danger'>删除</a>
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
                    name: params.name,
                    type: params.type,
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
            headerTitle="角色列表"
            toolBarRender={() => [
                <Show menu={'role-add'}>
                    <Button key="button" type="primary" onClick={() => {
                        setVisible(true)
                    }}>
                        新建
                    </Button>
                </Show>,
            ]}
        />

        <RoleModal
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

    </Content>);
}

export default Role;
