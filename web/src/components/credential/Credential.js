import React, {Component} from 'react';

import {
    Button,
    Col,
    Divider,
    Dropdown,
    Form,
    Input,
    Layout,
    Menu,
    Modal,
    PageHeader,
    Row,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography
} from "antd";
import qs from "qs";
import CredentialModal from "./CredentialModal";
import request from "../../common/request";
import {message} from "antd/es";
import {
    DeleteOutlined,
    DownOutlined,
    ExclamationCircleOutlined,
    OneToOneOutlined,
    PlusOutlined,
    SyncOutlined,
    UndoOutlined
} from '@ant-design/icons';
import {itemRender} from "../../utils/utils";
import Logout from "../user/Logout";

const confirm = Modal.confirm;
const {Search} = Input;
const {Title, Text} = Typography;
const {Content} = Layout;
const routes = [
    {
        path: '',
        breadcrumbName: '首页',
    },
    {
        path: 'credentials',
        breadcrumbName: '授权凭证',
    }
];

class Credential extends Component {

    inputRefOfName = React.createRef();
    changeOwnerFormRef = React.createRef();

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
        model: null,
        selectedRowKeys: [],
        delBtnLoading: false,
        changeOwnerModalVisible: false,
        changeOwnerConfirmLoading: false,
    };

    componentDidMount() {
        this.loadTableData();
    }

    async delete(id) {
        const result = await request.delete('/credentials/' + id);
        if (result.code === 1) {
            message.success('删除成功');
            await this.loadTableData(this.state.queryParams);
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
            let result = await request.get('/credentials/paging?' + paramsStr);
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

    handleChangPage = (pageIndex, pageSize) => {
        let queryParams = this.state.queryParams;
        queryParams.pageIndex = pageIndex;
        queryParams.pageSize = pageSize;

        this.setState({
            queryParams: queryParams
        });

        this.loadTableData(queryParams)
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
            title: '您确定要删除此记录吗?',
            content: content,
            okText: '确定',
            okType: 'danger',
            cancelText: '取消',
            onOk() {
                self.delete(id).then(r => {
                });
            }
        });
    };

    showModal = async (title, id = null, index) => {

        let items = this.state.items;
        items[index].updateBtnLoading = true;
        this.setState({
            items: items
        });

        let result = await request.get('/credentials/' + id);
        if (result['code'] !== 1) {
            message.error(result['message']);
            items[index].updateBtnLoading = false;
            this.setState({
                items: items
            });
            return;
        }

        items[index].updateBtnLoading = false;
        this.setState({
            modalTitle: title,
            modalVisible: true,
            model: result['data'],
            items: items
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
            const result = await request.put('/credentials/' + formData.id, formData);
            if (result.code === 1) {
                message.success('操作成功', 3);

                this.setState({
                    modalVisible: false
                });
                await this.loadTableData(this.state.queryParams);
            } else {
                message.error('操作失败 :( ' + result.message, 10);
            }
        } else {
            // 向后台提交数据
            const result = await request.post('/credentials', formData);
            if (result.code === 1) {
                message.success('操作成功', 3);

                this.setState({
                    modalVisible: false
                });
                await this.loadTableData(this.state.queryParams);
            } else {
                message.error('操作失败 :( ' + result.message, 10);
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
            let result = await request.delete('/credentials/' + this.state.selectedRowKeys.join(','));
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

    render() {

        const columns = [{
            title: '序号',
            dataIndex: 'id',
            key: 'id',
            render: (id, record, index) => {
                return index + 1;
            }
        }, {
            title: '凭证名称',
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
            title: '凭证类型',
            dataIndex: 'type',
            key: 'type',
            render: (type, record) => {

                if (type === 'private-key') {
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
            title: '所有者',
            dataIndex: 'ownerName',
            key: 'ownerName',
        }, {
            title: '创建时间',
            dataIndex: 'created',
            key: 'created',
        },
            {
                title: '操作',
                key: 'action',
                render: (text, record, index) => {

                    const menu = (
                        <Menu>
                            <Menu.Item key="1">
                                <Button type="text" size='small'
                                        onClick={() => {
                                            this.setState({
                                                changeOwnerModalVisible: true
                                            })
                                        }}>更换所有者</Button>
                            </Menu.Item>

                            <Menu.Item key="2">
                                <Button type="text" size='small'
                                        onClick={() => this.copy(record.id)}>分享</Button>
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
                            <Button type="link" size='small' loading={this.state.items[index].updateBtnLoading}
                                    onClick={() => this.showModal('更新凭证', record.id, index)}>编辑</Button>
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
                    className="site-page-header-ghost-wrapper page-herder"
                    title="授权凭证"
                    breadcrumb={{
                        routes: routes,
                        itemRender: itemRender
                    }}
                    extra={[
                        <Logout key='logout'/>
                    ]}
                    subTitle="访问资产的账户、密钥等"
                >
                </PageHeader>

                <Content className="site-layout-background page-content">

                    <div style={{marginBottom: 20}}>

                        <Row justify="space-around" align="middle" gutter={24}>
                            <Col span={12} key={1}>
                                <Title level={3}>授权凭证列表</Title>
                            </Col>
                            <Col span={12} key={2} style={{textAlign: 'right'}}>
                                <Space>
                                    <Search
                                        ref={this.inputRefOfName}
                                        placeholder="凭证名称"
                                        allowClear
                                        onSearch={this.handleSearchByName}
                                    />

                                    <Tooltip title='重置查询'>

                                        <Button icon={<UndoOutlined/>} onClick={() => {
                                            this.inputRefOfName.current.setValue('');
                                            this.loadTableData({pageIndex: 1, pageSize: 10, name: ''})
                                        }}>

                                        </Button>
                                    </Tooltip>

                                    <Divider type="vertical"/>

                                    <Tooltip title="新增">
                                        <Button type="dashed" icon={<PlusOutlined/>}
                                                onClick={() => this.showModal('新增凭证', null)}>

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
                        rowKey='id'
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
                    />

                    {
                        this.state.modalVisible ?
                            <CredentialModal
                                visible={this.state.modalVisible}
                                title={this.state.modalTitle}
                                handleOk={this.handleOk}
                                handleCancel={this.handleCancelModal}
                                confirmLoading={this.state.modalConfirmLoading}
                                model={this.state.model}
                                footer={this.state.modalTitle.indexOf('查看') > -1 ? null : undefined}
                            >

                            </CredentialModal>
                            : null
                    }

                    <Modal title="更换所有者" visible={this.state.changeOwnerModalVisible}
                           confirmLoading={this.state.changeOwnerConfirmLoading}
                           onOk={() => {
                               this.changeOwnerFormRef.current
                                   .validateFields()
                                   .then(values => {
                                       this.changeOwnerFormRef.current.resetFields();

                                   })
                                   .catch(info => {

                                   });
                           }}
                           onCancel={this.handleCancel}>

                        <Form ref={this.changeOwnerFormRef}>
                            <Form.Item name='totp' rules={[{required: true, message: '请选择所有者'}]}>
                                <Input prefix={<OneToOneOutlined/>} placeholder="请选择所有者"/>
                            </Form.Item>
                        </Form>
                    </Modal>

                </Content>
            </>
        );
    }
}

export default Credential;
