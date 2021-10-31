import React, {Component} from 'react';

import {Badge, Button, Col, Divider, Input, Layout, Modal, Row, Space, Table, Tag, Tooltip, Typography} from "antd";
import qs from "qs";
import request from "../../common/request";
import {message} from "antd/es";
import {DeleteOutlined, ExclamationCircleOutlined, PlusOutlined, SyncOutlined, UndoOutlined} from '@ant-design/icons';
import AccessGatewayModal from "./AccessGatewayModal";
import {hasPermission} from "../../service/permission";
import dayjs from "dayjs";

const confirm = Modal.confirm;
const {Content} = Layout;
const {Title, Text} = Typography;
const {Search} = Input;

class AccessGateway extends Component {

    inputRefOfName = React.createRef();
    inputRefOfIp = React.createRef();

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
    };

    componentDidMount() {
        this.loadTableData();
    }

    async delete(id) {
        const result = await request.delete('/access-gateways/' + id);
        if (result.code === 1) {
            message.success('删除成功');
            this.loadTableData(this.state.queryParams);
        } else {
            message.error(result.message, 10);
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
            let result = await request.get('/access-gateways/paging?' + paramsStr);
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

    handleSearchByIp = ip => {
        let query = {
            ...this.state.queryParams,
            'pageIndex': 1,
            'pageSize': this.state.queryParams.pageSize,
            'ip': ip,
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

    async update(id) {
        let result = await request.get(`/access-gateways/${id}`);
        if (result.code !== 1) {
            message.error(result.message, 10);
            return;
        }
        await this.showModal('更新接入网关', result.data);
    }

    async reconnect(id) {
        message.info({content: '正在重连中...', key: id, duration: 5});
        let result = await request.post(`/access-gateways/${id}/reconnect`);
        if (result.code !== 1) {
            message.error({content: result.message, key: id, duration: 10});
            return;
        }
        message.success({content: '重连完成。', key: id, duration: 3});
        this.loadTableData(this.state.queryParams);
    }

    showModal(title, obj) {
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

        if (formData.id) {
            // 向后台提交数据
            const result = await request.put('/access-gateways/' + formData.id, formData);
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
            const result = await request.post('/access-gateways', formData);
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
            let result = await request.delete('/access-gateways/' + this.state.selectedRowKeys.join(','));
            if (result.code === 1) {
                message.success('操作成功', 3);
                this.setState({
                    selectedRowKeys: []
                })
                await this.loadTableData(this.state.queryParams);
            } else {
                message.error(result.message, 10);
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
            title: '名称',
            dataIndex: 'name',
            key: 'name',
            render: (name, record) => {
                let short = name;
                if (short && short.length > 20) {
                    short = short.substring(0, 20) + " ...";
                }

                if (hasPermission(record['owner'])) {
                    return (
                        <Button type="link" size='small' onClick={() => this.update(record['id'])}>
                            <Tooltip placement="topLeft" title={name}>
                                {short}
                            </Tooltip>
                        </Button>
                    );
                } else {
                    return (
                        <Tooltip placement="topLeft" title={name}>
                            {short}
                        </Tooltip>
                    );
                }
            },
            sorter: true,
        }, {
            title: 'IP',
            dataIndex: 'ip',
            key: 'ip',
            sorter: true,
        }, {
            title: '端口',
            dataIndex: 'port',
            key: 'port',
        }, {
            title: '账户类型',
            dataIndex: 'accountType',
            key: 'accountType',
            render: (accountType) => {
                if (accountType === 'private-key') {
                    return (
                        <Tag color="green">密钥</Tag>
                    );
                } else {
                    return (
                        <Tag color="red">密码</Tag>
                    );
                }
            }
        }, {
            title: '授权账户',
            dataIndex: 'username',
            key: 'username',
        }, {
            title: '状态',
            dataIndex: 'connected',
            key: 'connected',
            render: (text, record) => {
                if (text) {
                    return (
                        <Tooltip title='连接成功'>
                            <Badge status="success" text='已连接'/>
                        </Tooltip>
                    )
                } else {
                    return (
                        <Tooltip title={record['message']}>
                            <Badge status="error" text='已断开'/>
                        </Tooltip>
                    )
                }
            }
        }, {
            title: '创建时间',
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
            title: '操作',
            key: 'action',
            render: (text, record, index) => {

                return (
                    <div>
                        <Button type="link" size='small' loading={this.state.items[index]['execLoading']}
                                onClick={() => this.update(record['id'])}>编辑</Button>

                        <Button type="link" size='small' loading={this.state.items[index]['execLoading']}
                                onClick={() => this.reconnect(record['id'])}>重连</Button>

                        <Button type="text" size='small' danger
                                onClick={() => this.showDeleteConfirm(record.id, record.name)}>删除</Button>

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
                <Content className="site-layout-background page-content">

                    <div style={{marginBottom: 20}}>
                        <Row justify="space-around" align="middle" gutter={24}>
                            <Col span={12} key={1}>
                                <Title level={3}>接入网关</Title>
                            </Col>
                            <Col span={12} key={2} style={{textAlign: 'right'}}>
                                <Space>
                                    <Search
                                        ref={this.inputRefOfName}
                                        placeholder="名称"
                                        allowClear
                                        onSearch={this.handleSearchByName}
                                    />

                                    <Search
                                        ref={this.inputRefOfIp}
                                        placeholder="IP"
                                        allowClear
                                        onSearch={this.handleSearchByIp}
                                    />

                                    <Tooltip title='重置查询'>

                                        <Button icon={<UndoOutlined/>} onClick={() => {
                                            this.inputRefOfName.current.setValue('');
                                            this.inputRefOfIp.current.setValue('');
                                            this.loadTableData({
                                                pageIndex: 1,
                                                pageSize: 10,
                                                name: '',
                                                ip: '',
                                                content: ''
                                            })
                                        }}>

                                        </Button>
                                    </Tooltip>

                                    <Divider type="vertical"/>

                                    <Tooltip title="新增">
                                        <Button type="dashed" icon={<PlusOutlined/>}
                                                onClick={() => this.showModal('新增接入网关', {})}>

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
                            <AccessGatewayModal
                                visible={this.state.modalVisible}
                                title={this.state.modalTitle}
                                handleOk={this.handleOk}
                                handleCancel={this.handleCancelModal}
                                confirmLoading={this.state.modalConfirmLoading}
                                model={this.state.model}
                            >
                            </AccessGatewayModal> : undefined
                    }
                </Content>
            </>
        );
    }
}

export default AccessGateway;
