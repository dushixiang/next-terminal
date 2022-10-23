import React, {useState} from 'react';
import {Button, Popconfirm} from "antd";
import {ProTable} from "@ant-design/pro-components";
import CommandModal from "../asset/CommandModal";
import workCommandApi from "../../api/worker/command";

const api = workCommandApi;
const actionRef = React.createRef();

const MyCommand = () => {

    let [visible, setVisible] = useState(false);
    let [confirmLoading, setConfirmLoading] = useState(false);
    let [selectedRowKey, setSelectedRowKey] = useState(undefined);

    const columns = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: '名称',
            dataIndex: 'name',
        }, {
            title: '内容',
            dataIndex: 'content',
            key: 'content',
            copyable: true,
            ellipsis: true
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
                <a
                    key="edit"
                    onClick={() => {
                        setVisible(true);
                        setSelectedRowKey(record['id']);
                    }}
                >
                    编辑
                </a>,
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
                </Popconfirm>,
            ],
        },
    ];

    return <div>
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
            headerTitle="指令列表"
            toolBarRender={() => [
                <Button key="button" type="primary" onClick={() => {
                    setVisible(true)
                }}>
                    新建
                </Button>,
            ]}
        />

        <CommandModal
            id={selectedRowKey}
            worker={true}
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
    </div>;
};

export default MyCommand;