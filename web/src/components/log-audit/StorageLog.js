import React, {useState} from 'react';
import {Button, Layout, Modal, Popconfirm} from "antd";
import {ProTable} from "@ant-design/pro-components";
import storageLogApi from "../../api/storage-log";
import {Link} from "react-router-dom";
import ColumnState, {useColumnState} from "../../hook/column-state";
import Show from "../../dd/fi/show";

const api = storageLogApi;
const {Content} = Layout;

const actionRef = React.createRef();

const StorageLog = () => {

    let [total, setTotal] = useState(0);
    const [columnsStateMap, setColumnsStateMap] = useColumnState(ColumnState.STORAGE_LOG);

    const columns = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: '资产名称',
            key: 'assetName',
            dataIndex: 'assetName',
            hideInSearch: true,
            render: ((text, record) => {
                return <Link to={`/assets/${record['assetId']}`}>{text}</Link>
            })
        },
        {
            title: '文件/文件夹名称',
            key: 'fileName',
            dataIndex: 'fileName',
            hideInSearch: true,
        },
        {
            title: '操作类型',
            key: 'action',
            dataIndex: 'action',
            valueType: 'select',
            valueEnum: {
                rm: {text: '删除'},
                upload: {
                    text: '上传',
                },
                download: {
                    text: '下载',
                },
                mkdir: {
                    text: '创建文件夹',
                },
                rename: {
                    text: '重命名',
                },
            }
        },
        {
            title: '操作用户',
            key: 'userName',
            dataIndex: 'userName',
            hideInSearch: true,
            render: ((text, record) => {
                return <Link to={`/users/${record['userId']}`}>{text}</Link>
            })
        },
        {
            title: '操作日期',
            key: 'created',
            dataIndex: 'created',
            hideInSearch: true,
        },
        {
            title: '操作',
            valueType: 'option',
            key: 'option',
            render: (text, record, _, action) => [
                <Show menu={'storage-log-del'} key={'storage-log-del'}>
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
                </Show>,
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
                            action: params.action,
                            field: field,
                            order: order
                        }
                        let result = await api.getPaging(queryParams);
                        setTotal(result['total']);
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
                    headerTitle="文件操作日志"
                    toolBarRender={() => [
                        <Show menu={'storage-log-clear'}>
                            <Button key="button"
                                    type="danger"
                                    disabled={total === 0}
                                    onClick={async () => {
                                        Modal.confirm({
                                            title: '您确定要清空全部的文件操作日志吗?',
                                            content: '清空之后无法进行恢复，请慎重考虑。',
                                            okText: '确定',
                                            okType: 'danger',
                                            cancelText: '取消',
                                            onOk: async () => {
                                                await api.Clear();
                                                actionRef.current.reload();
                                            }
                                        });

                                    }}>
                                清空
                            </Button>
                        </Show>,
                    ]}
                />
            </Content>
        </div>
    );
}

export default StorageLog;