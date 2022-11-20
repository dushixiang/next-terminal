import React, {useState} from 'react';

import {Button, Layout, Popconfirm} from "antd";
import {ProTable, TableDropdown} from "@ant-design/pro-components";
import UserGroupModal from "./UserGroupModal";
import userGroupApi from "../../api/user-group";
import {Link, useNavigate} from "react-router-dom";
import ColumnState, {useColumnState} from "../../hook/column-state";
import {hasMenu} from "../../service/permission";
import Show from "../../dd/fi/show";

const api = userGroupApi;
const {Content} = Layout;

const actionRef = React.createRef();

const UserGroup = () => {

    let [visible, setVisible] = useState(false);
    let [confirmLoading, setConfirmLoading] = useState(false);
    let [selectedRowKey, setSelectedRowKey] = useState(undefined);

    const [columnsStateMap, setColumnsStateMap] = useColumnState(ColumnState.USER_GROUP);
    let navigate = useNavigate();

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
                if (hasMenu('user-group-detail')) {
                    view = <Link to={`/user-group/${record['id']}`}>{text}</Link>;
                }
                return view;
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
                <Show menu={'user-group-edit'} key={'user-group-edit'}>
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
                <Show menu={'user-group-del'} key={'user-group-del'}>
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
                <TableDropdown
                    key="actionGroup"
                    onSelect={(key) => {
                        switch (key) {
                            case 'user-group-detail':
                                navigate(`/user-group/${record['id']}?activeKey=info`);
                                break;
                            case 'user-group-authorised-asset':
                                navigate(`/user-group/${record['id']}?activeKey=asset`);
                                break;
                        }
                    }}
                    menus={[
                        {key: 'user-group-detail', name: '详情', disabled: !hasMenu('user-group-detail')},
                        {key: 'user-group-authorised-asset', name: '授权资产', disabled: !hasMenu('user-group-authorised-asset')},
                    ]}
                />,
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
            headerTitle="用户组列表"
            toolBarRender={() => [
                <Show menu={'user-group-add'}>
                    <Button key="button" type="primary" onClick={() => {
                        setVisible(true)
                    }}>
                        新建
                    </Button>
                </Show>,
            ]}
        />

        <UserGroupModal
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

export default UserGroup;
