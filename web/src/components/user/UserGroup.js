import React, {Component} from 'react';
import {itemRender} from '../../utils/utils'

import {Button, Col, Divider, Input, Layout, Modal, PageHeader, Row, Space, Table, Tooltip, Typography,} from "antd";
import qs from "qs";
import request from "../../common/request";
import {message} from "antd/es";
import {DeleteOutlined, ExclamationCircleOutlined, PlusOutlined, SyncOutlined, UndoOutlined} from '@ant-design/icons';
import Logout from "./Logout";
import UserGroupModal from "./UserGroupModal";
import UserShareAsset from "./UserShareAsset";

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
        path: 'user',
        breadcrumbName: '用户组',
    }
];

class UserGroup extends Component {

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
        model: undefined,
        selectedRowKeys: [],
        delBtnLoading: false,
        users: [],
    };

    componentDidMount() {
        this.loadTableData();
    }

    async delete(id) {
        let result = await request.delete('/user-groups/' + id);
        if (result.code === 1) {
            message.success('操作成功', 3);
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

        let paramsStr = qs.stringify(queryParams);

        let data = {
            items: [],
            total: 0
        };

        try {
            let result = await request.get('/user-groups/paging?' + paramsStr);
            if (result.code === 1) {
                data = result.data;
            } else {
                message.error(result.message, 10);
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

        this.loadTableData(queryParams).then(r => {
        })
    };

    showDeleteConfirm(id, content) {
        let self = this;
        confirm({
            title: '您确定要删除此用户组吗?',
            content: content,
            okText: '确定',
            okType: 'danger',
            cancelText: '取消',
            onOk() {
                self.delete(id);
            }
        });
    };

    showModal = async (title, id, index) => {

        let items = this.state.items;

        let model = {}
        if (id) {
            items[index].updateBtnLoading = true;
            this.setState({
                items: items
            });

            let result = await request.get('/user-groups/' + id);
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

        await this.handleSearchByNickname('');
        console.log(model)
        this.setState({
            model: model,
            modalVisible: true,
            modalTitle: title
        });
    };

    handleCancelModal = e => {
        this.setState({
            modalVisible: false,
            modalTitle: '',
            model: undefined
        });
    };

    handleOk = async (formData) => {
        // 弹窗 form 传来的数据
        this.setState({
            modalConfirmLoading: true
        });

        if (formData.id) {
            // 向后台提交数据
            const result = await request.put('/user-groups/' + formData.id, formData);
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
            const result = await request.post('/user-groups', formData);
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

    handleSearchByName = name => {
        let query = {
            ...this.state.queryParams,
            'pageIndex': 1,
            'pageSize': this.state.queryParams.pageSize,
            'name': name,
        }

        this.loadTableData(query);
    };

    batchDelete = async () => {
        this.setState({
            delBtnLoading: true
        })
        try {
            let result = await request.delete('/user-groups/' + this.state.selectedRowKeys.join(','));
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
        const result = await request.get(`/users/paging?pageIndex=1&pageSize=1000&nickname=${nickname}`);
        if (result.code !== 1) {
            message.error(result.message, 10);
            return;
        }

        this.setState({
            users: result.data.items
        })
    }

    handleAssetCancel = () => {
        this.loadTableData()
        this.setState({
            assetVisible: false
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
            title: '名称',
            dataIndex: 'name',
        }, {
            title: '授权资产',
            dataIndex: 'assetCount',
            key: 'assetCount',
            render: (text, record, index) => {
                return <Button type='link' onClick={async () => {
                    this.setState({
                        assetVisible: true,
                        userGroupId: record['id']
                    })
                }}>{text}</Button>
            }
        }, {
            title: '创建日期',
            dataIndex: 'created',
            key: 'created'
        },
            {
                title: '操作',
                key: 'action',
                render: (text, record, index) => {
                    return (
                        <div>
                            <Button type="link" size='small'
                                    loading={this.state.items[index].updateBtnLoading}
                                    onClick={() => this.showModal('更新用户组', record['id'], index)}>编辑</Button>
                            <Button type="link" size='small'
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
                <PageHeader
                    className="site-page-header-ghost-wrapper page-herder"
                    title="用户组管理"
                    breadcrumb={{
                        routes: routes,
                        itemRender: itemRender
                    }}
                    extra={[
                        <Logout key='logout'/>
                    ]}
                    subTitle="平台用户管理"
                >
                </PageHeader>

                <Content className="site-layout-background page-content">
                    <div style={{marginBottom: 20}}>
                        <Row justify="space-around" align="middle" gutter={24}>
                            <Col span={8} key={1}>
                                <Title level={3}>用户组列表</Title>
                            </Col>
                            <Col span={16} key={2} style={{textAlign: 'right'}}>
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
                                            this.loadTableData({pageIndex: 1, pageSize: 10})
                                        }}>

                                        </Button>
                                    </Tooltip>

                                    <Divider type="vertical"/>

                                    <Tooltip title="新增">
                                        <Button type="dashed" icon={<PlusOutlined/>}
                                                onClick={() => this.showModal('新增用户组')}>

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

                    <Table rowSelection={rowSelection}
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

                    {/* 为了屏蔽ant modal 关闭后数据仍然遗留的问题*/}
                    {this.state.modalVisible ?
                        <UserGroupModal
                            visible={this.state.modalVisible}
                            title={this.state.modalTitle}
                            handleOk={this.handleOk}
                            handleCancel={this.handleCancelModal}
                            confirmLoading={this.state.modalConfirmLoading}
                            model={this.state.model}
                            users={this.state.users}
                        >
                        </UserGroupModal> : undefined
                    }

                    <Modal
                        width={window.innerWidth * 0.8}
                        title='已授权资产'
                        visible={this.state.assetVisible}
                        maskClosable={false}
                        centered={true}
                        destroyOnClose={true}
                        onOk={() => {

                        }}
                        onCancel={this.handleAssetCancel}
                        okText='确定'
                        cancelText='取消'
                        footer={null}
                    >
                        <UserShareAsset
                            userGroupId={this.state.userGroupId}
                        />
                    </Modal>

                </Content>
            </>
        );
    }
}

export default UserGroup;
