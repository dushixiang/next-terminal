import React, {useState} from 'react';
import './Job.css'
import {Button, Layout, message, Popconfirm, Switch, Tag, Tooltip} from "antd";
import {ProTable} from "@ant-design/pro-components";
import jobApi from "../../api/job";
import JobModal from "./JobModal";
import dayjs from "dayjs";
import JobLog from "./JobLog";
import ColumnState, {useColumnState} from "../../hook/column-state";
import Show from "../../dd/fi/show";
import {hasMenu} from "../../service/permission";

const {Content} = Layout;

const actionRef = React.createRef();

const api = jobApi;

const Job = () => {
    let [visible, setVisible] = useState(false);
    let [confirmLoading, setConfirmLoading] = useState(false);
    let [selectedRowKey, setSelectedRowKey] = useState(undefined);

    let [logVisible, setLogVisible] = useState(false);

    let [execLoading, setExecLoading] = useState([]);
    const [columnsStateMap, setColumnsStateMap] = useColumnState(ColumnState.JOB);

    const columns = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: '任务名称',
            dataIndex: 'name',
            key: 'name',
            sorter: true,
        }
        , {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            hideInSearch: true,
            render: (status, record, index) => {
                return <Switch disabled={!hasMenu('job-change-status')} checkedChildren="开启" unCheckedChildren="关闭"
                               checked={status === 'running'}
                               onChange={(checked) => handleChangeStatus(record['id'], checked ? 'running' : 'not-running', index)}
                />
            }
        }, {
            title: '任务类型',
            dataIndex: 'func',
            key: 'func',
            hideInSearch: true,
            render: (func, record) => {
                switch (func) {
                    case "check-asset-status-job":
                        return <Tag color="green">资产状态检测</Tag>;
                    case "shell-job":
                        return <Tag color="volcano">Shell脚本</Tag>;
                    default:
                        return '';
                }
            }
        }, {
            title: 'cron表达式',
            dataIndex: 'cron',
            key: 'cron',
            hideInSearch: true,
        }, {
            title: '创建日期',
            dataIndex: 'created',
            key: 'created',
            hideInSearch: true,
            render: (text, record) => {
                return (
                    <Tooltip title={text}>
                        {dayjs(text).fromNow()}
                    </Tooltip>
                )
            },
            sorter: true,
        }, {
            title: '最后执行日期',
            dataIndex: 'updated',
            key: 'updated',
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
            sorter: true,
        },
        {
            title: '操作',
            valueType: 'option',
            key: 'option',
            render: (text, record, index, action) => [
                <Show menu={'job-run'} key={'job-run'}>
                    <a
                        key="exec"
                        disabled={execLoading[index]}
                        onClick={() => handleExec(record['id'], index)}
                    >
                        执行
                    </a>
                </Show>,
                <Show menu={'job-log'} key={'job-log'}>
                    <a
                        key="logs"
                        onClick={() => handleShowLog(record['id'])}
                    >
                        日志
                    </a>
                </Show>,
                <Show menu={'job-edit'} key={'job-edit'}>
                    <a
                        key="edit"
                        onClick={() => {
                            setVisible(true);
                            setSelectedRowKey(record['id']);
                        }}
                    >
                        编辑
                    </a>
                </Show>,
                <Show menu={'job-del'} key={'job-del'}>
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

    const handleChangeStatus = async (id, status, index) => {
        await api.changeStatus(id, status);
        actionRef.current.reload();
    }

    const handleExec = async (id, index) => {
        message.loading({content: '正在执行...', key: id, duration: 30});
        execLoading[index] = true;
        setExecLoading(execLoading.slice());

        await api.exec(id);

        message.success({content: '执行成功', key: id});
        execLoading[index] = false;
        setExecLoading(execLoading.slice());
        actionRef.current.reload();
    }

    const handleShowLog = (id) => {
        setLogVisible(true);
        setSelectedRowKey(id);
    }

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
                        let items = result['items'];

                        for (let i = 0; i < items.length; i++) {
                            execLoading.push(false);
                        }
                        setExecLoading(execLoading.slice());

                        return {
                            data: items,
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
                    headerTitle="计划任务列表"
                    toolBarRender={() => [
                        <Show menu={'job-add'}>
                            <Button key="button" type="primary" onClick={() => {
                                setVisible(true)
                            }}>
                                新建
                            </Button>
                        </Show>,
                    ]}
                />

                <JobModal
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
                            if (values['func'] === 'shell-job') {
                                values['metadata'] = JSON.stringify({
                                    'shell': values['shell']
                                });
                            }
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

                <JobLog
                    id={selectedRowKey}
                    visible={logVisible}
                    handleCancel={() => {
                        setLogVisible(false);
                        setSelectedRowKey(undefined);
                    }}
                >

                </JobLog>
            </Content>
        </div>
    );
}

export default Job;
