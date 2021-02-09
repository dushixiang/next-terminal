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
    Select,
    Space,
    Table,
    Tag,
    Tooltip,
    Transfer,
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
    PlusOutlined,
    SyncOutlined,
    UndoOutlined
} from '@ant-design/icons';
import {itemRender} from "../../utils/utils";
import Logout from "../user/Logout";
import {hasPermission, isAdmin} from "../../service/permission";

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
        changeSharerModalVisible: false,
        changeOwnerConfirmLoading: false,
        changeSharerConfirmLoading: false,
        users: [],
        selected: {},
        selectedSharers: [],
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

        let model = {}
        if (id) {
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
            model = result['data']
        }

        this.setState({
            modalTitle: title,
            modalVisible: true,
            model: model,
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

    handleSearchByNickname = async nickname => {
        const result = await request.get(`/users/paging?pageIndex=1&pageSize=100&nickname=${nickname}`);
        if (result.code !== 1) {
            message.error(result.message, 10);
            return;
        }

        const items = result['data']['items'].map(item => {
            return {'key': item['id'], 'disabled': false, ...item}
        })

        this.setState({
            users: items
        })
    }

    handleSharersChange = async targetKeys => {
        this.setState({
            selectedSharers: targetKeys
        })
    }

    handleShowSharer = async (record) => {
        let r1 = this.handleSearchByNickname('');
        let r2 = request.get(`/resource-sharers/sharers?resourceId=${record['id']}`);

        await r1;
        let result = await r2;

        let selectedSharers = [];
        if (result['code'] !== 1) {
            message.error(result['message']);
        } else {
            selectedSharers = result['data'];
        }

        let users = this.state.users;
        users = users.map(item => {
            let disabled = false;
            if (record['owner'] === item['id']) {
                disabled = true;
            }
            return {...item, 'disabled': disabled}
        });

        this.setState({
            selectedSharers: selectedSharers,
            selected: record,
            changeSharerModalVisible: true,
            users: users
        })
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
                            {isAdmin() ?
                                <Menu.Item key="1">
                                    <Button type="text" size='small'
                                            disabled={!hasPermission(record['owner'])}
                                            onClick={() => {
                                                this.handleSearchByNickname('')
                                                    .then(() => {
                                                        this.setState({
                                                            changeOwnerModalVisible: true,
                                                            selected: record,
                                                        })
                                                        this.changeOwnerFormRef
                                                            .current
                                                            .setFieldsValue({
                                                                owner: record['owner']
                                                            })
                                                    });

                                            }}>更换所有者</Button>
                                </Menu.Item> : undefined
                            }


                            <Menu.Item key="2">
                                <Button type="text" size='small'
                                        disabled={!hasPermission(record['owner'])}
                                        onClick={async () => {
                                            await this.handleShowSharer(record);
                                        }}>更新授权人</Button>
                            </Menu.Item>

                            <Menu.Divider/>
                            <Menu.Item key="3">
                                <Button type="text" size='small' danger
                                        disabled={!hasPermission(record['owner'])}
                                        onClick={() => this.showDeleteConfirm(record.id, record.name)}>删除</Button>
                            </Menu.Item>
                        </Menu>
                    );

                    return (
                        <div>
                            <Button type="link" size='small' loading={this.state.items[index].updateBtnLoading}
                                    disabled={!hasPermission(record['owner'])}
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

        if (isAdmin()) {
            columns.splice(5, 0, {
                title: '授权人数',
                dataIndex: 'sharerCount',
                key: 'sharerCount',
                render: (text, record, index) => {
                    return <Button type='link' onClick={async () => {
                        await this.handleShowSharer(record);
                    }}>{text}</Button>
                }
            });
        }

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
                                                onClick={() => this.showModal('新增凭证')}>

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
                            >

                            </CredentialModal>
                            : null
                    }

                    <Modal title={<Text>更换资源「<strong style={{color: '#1890ff'}}>{this.state.selected['name']}</strong>」的所有者
                    </Text>}
                           visible={this.state.changeOwnerModalVisible}
                           confirmLoading={this.state.changeOwnerConfirmLoading}
                           centered={true}
                           onOk={() => {
                               this.setState({
                                   changeOwnerConfirmLoading: true
                               });

                               let changeOwnerModalVisible = false;
                               this.changeOwnerFormRef
                                   .current
                                   .validateFields()
                                   .then(async values => {
                                       let result = await request.post(`/credentials/${this.state.selected['id']}/change-owner?owner=${values['owner']}`);
                                       if (result['code'] === 1) {
                                           message.success('操作成功');
                                           this.loadTableData();
                                       } else {
                                           message.error(result['message'], 10);
                                           changeOwnerModalVisible = true;
                                       }
                                   })
                                   .catch(info => {

                                   })
                                   .finally(() => {
                                       this.setState({
                                           changeOwnerConfirmLoading: false,
                                           changeOwnerModalVisible: changeOwnerModalVisible
                                       })
                                   });
                           }}
                           onCancel={() => {
                               this.setState({
                                   changeOwnerModalVisible: false
                               })
                           }}
                    >

                        <Form ref={this.changeOwnerFormRef}>
                            <Form.Item name='owner' rules={[{required: true, message: '请选择所有者'}]}>
                                <Select
                                    showSearch
                                    placeholder='请选择所有者'
                                    onSearch={this.handleSearchByNickname}
                                    filterOption={false}
                                >
                                    {this.state.users.map(d => <Select.Option key={d.id}
                                                                              value={d.id}>{d.nickname}</Select.Option>)}
                                </Select>
                            </Form.Item>
                        </Form>
                    </Modal>

                    {
                        this.state.changeSharerModalVisible ?
                            <Modal title={<Text>更新资源「<strong
                                style={{color: '#1890ff'}}>{this.state.selected['name']}</strong>」的授权人
                            </Text>}
                                   visible={this.state.changeSharerModalVisible}
                                   confirmLoading={this.state.changeSharerConfirmLoading}
                                   centered={true}
                                   onOk={async () => {
                                       this.setState({
                                           changeSharerConfirmLoading: true
                                       });

                                       let changeSharerModalVisible = false;

                                       let result = await request.post(`/resource-sharers/overwrite-sharers`, {
                                           resourceId: this.state.selected['id'],
                                           resourceType: 'credential',
                                           userIds: this.state.selectedSharers
                                       });
                                       if (result['code'] === 1) {
                                           message.success('操作成功');
                                           this.loadTableData();
                                       } else {
                                           message.error(result['message'], 10);
                                           changeSharerModalVisible = true;
                                       }

                                       this.setState({
                                           changeSharerConfirmLoading: false,
                                           changeSharerModalVisible: changeSharerModalVisible
                                       })
                                   }}
                                   onCancel={() => {
                                       this.setState({
                                           changeSharerModalVisible: false
                                       })
                                   }}
                                   okButtonProps={{disabled: !hasPermission(this.state.selected['owner'])}}
                            >

                                <Transfer
                                    dataSource={this.state.users}
                                    disabled={!hasPermission(this.state.selected['owner'])}
                                    showSearch
                                    titles={['未授权', '已授权']}
                                    operations={['授权', '移除']}
                                    listStyle={{
                                        width: 250,
                                        height: 300,
                                    }}
                                    targetKeys={this.state.selectedSharers}
                                    onChange={this.handleSharersChange}
                                    render={item => `${item.nickname}`}
                                />
                            </Modal> : undefined
                    }

                </Content>
            </>
        );
    }
}

export default Credential;
