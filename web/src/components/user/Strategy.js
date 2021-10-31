import React, {Component} from 'react';

import {Button, Col, Divider, Input, Layout, Modal, Row, Space, Table, Tag, Tooltip, Typography} from "antd";
import qs from "qs";
import request from "../../common/request";
import {message} from "antd/es";
import {DeleteOutlined, ExclamationCircleOutlined, PlusOutlined, SyncOutlined, UndoOutlined} from '@ant-design/icons';
import StrategyModal from "./StrategyModal";
import {cloneObj} from "../../utils/utils";

const confirm = Modal.confirm;
const {Content} = Layout;
const {Title, Text} = Typography;
const {Search} = Input;

const keys = ['upload', 'download', 'delete', 'rename', 'edit'];

class Strategy extends Component {

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
    };

    componentDidMount() {
        this.loadTableData();
    }

    async delete(id) {
        const result = await request.delete('/strategies/' + id);
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
            let result = await request.get('/strategies/paging?' + paramsStr);
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

    showModal(title, obj = undefined) {
        let model = obj;
        if (model) {
            model = cloneObj(obj);
            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];
                if (!model.hasOwnProperty(key)) {
                    continue;
                }
                model[key] = model[key] === '1';
            }
        }

        this.setState({
            modalTitle: title,
            modalVisible: true,
            model: model
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

        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            if (!formData.hasOwnProperty(key)) {
                continue;
            }
            if (formData[key] === true) {
                formData[key] = '1';
            } else {
                formData[key] = '0';
            }
        }

        if (formData.id) {
            // 向后台提交数据
            const result = await request.put('/strategies/' + formData.id, formData);
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
            const result = await request.post('/strategies', formData);
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
            let result = await request.delete('/strategies/' + this.state.selectedRowKeys.join(','));
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

        const renderStatus = (text) => {
            if (text === '1') {
                return <Tag color={'green'}>开启</Tag>
            } else {
                return <Tag color={'red'}>关闭</Tag>
            }
        }

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
            sorter: true,
        }, {
            title: '上传',
            dataIndex: 'upload',
            key: 'upload',
            render: (text) => {
                return renderStatus(text);
            }
        }, {
            title: '下载',
            dataIndex: 'download',
            key: 'download',
            render: (text) => {
                return renderStatus(text);
            }
        }, {
            title: '编辑',
            dataIndex: 'edit',
            key: 'edit',
            render: (text) => {
                return renderStatus(text);
            }
        }, {
            title: '删除',
            dataIndex: 'delete',
            key: 'delete',
            render: (text) => {
                return renderStatus(text);
            }
        }, {
            title: '重命名',
            dataIndex: 'rename',
            key: 'rename',
            render: (text) => {
                return renderStatus(text);
            }
        }, {
            title: '创建时间',
            dataIndex: 'created',
            key: 'created',
        }, {
            title: '操作',
            key: 'action',
            render: (text, record, index) => {

                return (
                    <div>
                        <Button type="link" size='small' loading={this.state.items[index]['execLoading']}
                                onClick={() => this.showModal('更新授权策略', record)}>编辑</Button>

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
                                <Title level={3}>授权策略</Title>
                            </Col>
                            <Col span={12} key={2} style={{textAlign: 'right'}}>
                                <Space>
                                    <Search
                                        ref={this.inputRefOfName}
                                        placeholder="名称"
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
                                                onClick={() => this.showModal('新增授权策略')}>

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
                            <StrategyModal
                                visible={this.state.modalVisible}
                                title={this.state.modalTitle}
                                handleOk={this.handleOk}
                                handleCancel={this.handleCancelModal}
                                confirmLoading={this.state.modalConfirmLoading}
                                model={this.state.model}
                            >
                            </StrategyModal> : undefined
                    }
                </Content>
            </>
        );
    }
}

export default Strategy;
