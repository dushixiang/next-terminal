import React, {Component} from 'react';

import {
    Button,
    Col,
    Divider,
    Dropdown,
    Input,
    Layout,
    Menu,
    Modal,
    PageHeader,
    Row,
    Space,
    Spin,
    Switch,
    Table,
    Tag,
    Tooltip,
    Typography
} from "antd";
import qs from "qs";
import request from "../../common/request";
import {message} from "antd/es";
import {
    DeleteOutlined,
    DownOutlined,
    ExclamationCircleOutlined,
    PlusOutlined,
    SyncOutlined,
    UndoOutlined
} from '@ant-design/icons';
import {itemRender} from "../../utils/utils";

import dayjs from "dayjs";
import JobModal from "./JobModal";
import './Job.css'

const confirm = Modal.confirm;
const {Content} = Layout;
const {Title, Text} = Typography;
const {Search} = Input;
const routes = [
    {
        path: '',
        breadcrumbName: '首页',
    },
    {
        path: 'job',
        breadcrumbName: '计划任务',
    }
];

class Job extends Component {

    inputRefOfName = React.createRef();

    state = {
        items: [],
        total: 0,
        queryParams: {
            pageIndex: 1,
            pageSize: 10
        },
        loading: false,
        modalVisible: false,
        modalTitle: '',
        modalConfirmLoading: false,
        selectedRow: undefined,
        selectedRowKeys: [],
        logPending: false,
        logs: []
    };

    componentDidMount() {
        this.loadTableData();
    }

    async delete(id) {
        const result = await request.delete('/jobs/' + id);
        if (result.code === 1) {
            message.success('删除成功');
            this.loadTableData(this.state.queryParams);
        } else {
            message.error('删除失败 :( ' + result.message, 10);
        }

    }

    async loadTableData(queryParams) {
        this.setState({
            loading: true
        });

        queryParams = queryParams || this.state.queryParams;

        // queryParams
        let paramsStr = qs.stringify(queryParams);

        let data = {
            items: [],
            total: 0
        };

        try {
            let result = await request.get('/jobs/paging?' + paramsStr);
            if (result.code === 1) {
                data = result.data;
            } else {
                message.error(result.message);
            }
        } catch (e) {

        } finally {
            const items = data.items.map(item => {
                return {'key': item['id'], ...item}
            })
            this.setState({
                items: items,
                total: data.total,
                queryParams: queryParams,
                loading: false
            });
        }
    }

    handleChangPage = async (pageIndex, pageSize) => {
        let queryParams = this.state.queryParams;
        queryParams.pageIndex = pageIndex;
        queryParams.pageSize = pageSize;

        this.setState({
            queryParams: queryParams
        });

        await this.loadTableData(queryParams)
    };

    handleSearchByName = name => {
        let query = {
            ...this.state.queryParams,
            'pageIndex': 1,
            'pageSize': this.state.queryParams.pageSize,
            'name': name,
        }
        this.loadTableData(query);
    };

    showDeleteConfirm(id, content) {
        let self = this;
        confirm({
            title: '您确定要删除此任务吗?',
            content: content,
            okText: '确定',
            okType: 'danger',
            cancelText: '取消',
            onOk() {
                self.delete(id);
            }
        });
    };

    showModal(title, obj = null) {
        if (obj['func'] === 'shell-job') {
            obj['shell'] = JSON.parse(obj['metadata'])['shell'];
        }

        if (obj['mode'] === 'custom') {
            obj['resourceIds'] = obj['resourceIds'].split(',');
        }

        this.setState({
            modalTitle: title,
            modalVisible: true,
            model: obj
        });
    };

    handleCancelModal = e => {
        this.setState({
            modalTitle: '',
            modalVisible: false
        });
    };

    handleOk = async (formData) => {
        // 弹窗 form 传来的数据
        this.setState({
            modalConfirmLoading: true
        });

        console.log(formData)
        if (formData['func'] === 'shell-job') {
            console.log(formData['shell'], JSON.stringify({'shell': formData['shell']}))

            formData['metadata'] = JSON.stringify({'shell': formData['shell']});
            formData['shell'] = undefined;
        }

        if (formData['mode'] === 'custom') {
            let resourceIds = formData['resourceIds'];
            formData['resourceIds'] = resourceIds.join(',');
        }

        if (formData.id) {
            // 向后台提交数据
            const result = await request.put('/jobs/' + formData.id, formData);
            if (result.code === 1) {
                message.success('更新成功');

                this.setState({
                    modalVisible: false
                });
                this.loadTableData(this.state.queryParams);
            } else {
                message.error('更新失败 :( ' + result.message, 10);
            }
        } else {
            // 向后台提交数据
            const result = await request.post('/jobs', formData);
            if (result.code === 1) {
                message.success('新增成功');

                this.setState({
                    modalVisible: false
                });
                this.loadTableData(this.state.queryParams);
            } else {
                message.error('新增失败 :( ' + result.message, 10);
            }
        }

        this.setState({
            modalConfirmLoading: false
        });
    };

    batchDelete = async () => {
        this.setState({
            delBtnLoading: true
        })
        try {
            let result = await request.delete('/jobs/' + this.state.selectedRowKeys.join(','));
            if (result.code === 1) {
                message.success('操作成功', 3);
                this.setState({
                    selectedRowKeys: []
                })
                await this.loadTableData(this.state.queryParams);
            } else {
                message.error('删除失败 :( ' + result.message, 10);
            }
        } finally {
            this.setState({
                delBtnLoading: false
            })
        }
    }

    handleTableChange = (pagination, filters, sorter) => {
        let query = {
            ...this.state.queryParams,
            'order': sorter.order,
            'field': sorter.field
        }

        this.loadTableData(query);
    }

    render() {

        const columns = [{
            title: '序号',
            dataIndex: 'id',
            key: 'id',
            render: (id, record, index) => {
                return index + 1;
            }
        }, {
            title: '任务名称',
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
            },
            sorter: true,
        }, {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status, record) => {
                return <Switch checkedChildren="开启" unCheckedChildren="关闭" checked={status === 'running'}
                               onChange={async (checked) => {
                                   let jobStatus = checked ? 'running' : 'not-running';
                                   let result = await request.post(`/jobs/${record['id']}/change-status?status=${jobStatus}`);
                                   if (result['code'] === 1) {
                                       message.success('操作成功');
                                       await this.loadTableData();
                                   } else {
                                       message.error(result['message']);
                                   }
                               }}
                />
            }
        }, {
            title: '任务类型',
            dataIndex: 'func',
            key: 'func',
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
            key: 'cron'
        }, {
            title: '创建日期',
            dataIndex: 'created',
            key: 'created',
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
            render: (text, record) => {
                if (text === '0001-01-01 00:00:00') {
                    return '';
                }
                return (
                    <Tooltip title={text}>
                        {dayjs(text).fromNow()}
                    </Tooltip>
                )
            },
            sorter: true,
        }, {
            title: '操作',
            key: 'action',
            render: (text, record, index) => {

                const menu = (
                    <Menu>
                        <Menu.Item key="0">
                            <Button type="text" size='small'
                                    onClick={() => this.showModal('更新计划任务', record)}>编辑</Button>
                        </Menu.Item>

                        <Menu.Item key="2">
                            <Button type="text" size='small'
                                    onClick={async () => {
                                        this.setState({
                                            logVisible: true,
                                            logPending: true
                                        })

                                        let result = await request.get(`/jobs/${record['id']}/logs`);
                                        if (result['code'] === 1) {
                                            this.setState({
                                                logPending: false,
                                                logs: result['data'],
                                                selectedRow: record
                                            })
                                        }

                                    }}>日志</Button>
                        </Menu.Item>

                        <Menu.Divider/>
                        <Menu.Item key="3">
                            <Button type="text" size='small' danger
                                    onClick={() => this.showDeleteConfirm(record.id, record.name)}>删除</Button>
                        </Menu.Item>
                    </Menu>
                );

                return (
                    <div>
                        <Button type="link" size='small' loading={this.state.items[index]['execLoading']}
                                onClick={async () => {
                                    let items = this.state.items;
                                    items[index]['execLoading'] = true;
                                    this.setState({
                                        items: items
                                    });

                                    let result = await request.post(`/jobs/${record['id']}/exec`);
                                    if (result['code'] === 1) {
                                        message.success('执行成功');
                                        await this.loadTableData();
                                    } else {
                                        message.error(result['message']);
                                        items[index]['execLoading'] = false;
                                        this.setState({
                                            items: items
                                        });
                                    }
                                }}>执行</Button>

                        <Dropdown overlay={menu}>
                            <Button type="link" size='small'>
                                更多 <DownOutlined/>
                            </Button>
                        </Dropdown>

                    </div>
                )
            },
        }
        ];

        const selectedRowKeys = this.state.selectedRowKeys;
        const rowSelection = {
            selectedRowKeys: this.state.selectedRowKeys,
            onChange: (selectedRowKeys, selectedRows) => {
                this.setState({selectedRowKeys});
            },
        };
        const hasSelected = selectedRowKeys.length > 0;

        return (
            <>
                <PageHeader
                    className="site-page-header-ghost-wrapper"
                    title="计划任务"
                    breadcrumb={{
                        routes: routes,
                        itemRender: itemRender
                    }}

                    subTitle="计划任务"
                >
                </PageHeader>

                <Content className="site-layout-background page-content">

                    <div style={{marginBottom: 20}}>
                        <Row justify="space-around" align="middle" gutter={24}>
                            <Col span={12} key={1}>
                                <Title level={3}>任务列表</Title>
                            </Col>
                            <Col span={12} key={2} style={{textAlign: 'right'}}>
                                <Space>
                                    <Search
                                        ref={this.inputRefOfName}
                                        placeholder="任务名称"
                                        allowClear
                                        onSearch={this.handleSearchByName}
                                    />


                                    <Tooltip title='重置查询'>

                                        <Button icon={<UndoOutlined/>} onClick={() => {
                                            this.inputRefOfName.current.setValue('');
                                            this.loadTableData({pageIndex: 1, pageSize: 10, name: '', content: ''})
                                        }}>

                                        </Button>
                                    </Tooltip>

                                    <Divider type="vertical"/>

                                    <Tooltip title="新增">
                                        <Button type="dashed" icon={<PlusOutlined/>}
                                                onClick={() => this.showModal('新增计划任务', {})}>

                                        </Button>
                                    </Tooltip>


                                    <Tooltip title="刷新列表">
                                        <Button icon={<SyncOutlined/>} onClick={() => {
                                            this.loadTableData(this.state.queryParams)
                                        }}>

                                        </Button>
                                    </Tooltip>


                                    <Tooltip title="批量删除">
                                        <Button type="primary" danger disabled={!hasSelected} icon={<DeleteOutlined/>}
                                                loading={this.state.delBtnLoading}
                                                onClick={() => {
                                                    const content = <div>
                                                        您确定要删除选中的<Text style={{color: '#1890FF'}}
                                                                       strong>{this.state.selectedRowKeys.length}</Text>条记录吗？
                                                    </div>;
                                                    confirm({
                                                        icon: <ExclamationCircleOutlined/>,
                                                        content: content,
                                                        onOk: () => {
                                                            this.batchDelete()
                                                        },
                                                        onCancel() {

                                                        },
                                                    });
                                                }}>

                                        </Button>
                                    </Tooltip>

                                </Space>
                            </Col>
                        </Row>
                    </div>

                    <Table
                        rowSelection={rowSelection}
                        dataSource={this.state.items}
                        columns={columns}
                        position={'both'}
                        pagination={{
                            showSizeChanger: true,
                            current: this.state.queryParams.pageIndex,
                            pageSize: this.state.queryParams.pageSize,
                            onChange: this.handleChangPage,
                            onShowSizeChange: this.handleChangPage,
                            total: this.state.total,
                            showTotal: total => `总计 ${total} 条`
                        }}
                        loading={this.state.loading}
                        onChange={this.handleTableChange}
                    />

                    {
                        this.state.modalVisible ?
                            <JobModal
                                visible={this.state.modalVisible}
                                title={this.state.modalTitle}
                                handleOk={this.handleOk}
                                handleCancel={this.handleCancelModal}
                                confirmLoading={this.state.modalConfirmLoading}
                                model={this.state.model}
                            >
                            </JobModal> : undefined
                    }

                    {
                        this.state.logVisible ?
                            <Modal
                                className='modal-no-padding'
                                width={window.innerWidth * 0.8}
                                title={'日志'}
                                visible={true}
                                maskClosable={false}

                                onOk={async () => {
                                    let result = await request.delete(`/jobs/${this.state.selectedRow['id']}/logs`);
                                    if (result['code'] === 1) {
                                        this.setState({
                                            logVisible: false,
                                            selectedRow: undefined
                                        })
                                        message.success('日志清空成功');
                                    } else {
                                        message.error(result['message'], 10);
                                    }
                                }}
                                onCancel={() => {
                                    this.setState({
                                        logVisible: false,
                                        selectedRow: undefined
                                    })
                                }}
                                okText='清空'
                                okType={'danger'}
                                cancelText='取消'
                            >
                                <Spin tip='加载中...' spinning={this.state.logPending}>
                                    <pre className='cron-log'>
                                        {
                                            this.state.logs.map(item => {

                                                return <><Divider
                                                    orientation="left"
                                                    style={{color: 'white'}}>{item['timestamp']}</Divider>{item['message']}</>;
                                            })
                                        }
                                    </pre>
                                </Spin>
                            </Modal> : undefined
                    }
                </Content>
            </>
        );
    }
}

export default Job;
