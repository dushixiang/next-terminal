import React, {Component} from 'react';

import {
    Button,
    Checkbox,
    Col,
    Divider,
    Input,
    Layout,
    Modal,
    PageHeader,
    Row,
    Space,
    Table,
    Tooltip,
    Typography
} from "antd";
import qs from "qs";
import request from "../../common/request";
import {message} from "antd/es";
import DynamicCommandModal from "./DynamicCommandModal";
import {
    CodeTwoTone,
    DeleteOutlined,
    DeleteTwoTone,
    EditTwoTone,
    ExclamationCircleOutlined,
    PlusOutlined,
    SyncOutlined,
    UndoOutlined
} from '@ant-design/icons';
import {itemRender} from "../../utils/utils";
import Logout from "../user/Logout";

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
        path: 'command',
        breadcrumbName: '动态指令',
    }
];

class DynamicCommand extends Component {

    inputRefOfName = React.createRef();
    inputRefOfContent = React.createRef();

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
        assetsVisible: false,
        assets: [],
        checkedAssets: [],
        command: '',
        model: null,
        selectedRowKeys: [],
        delBtnLoading: false,
    };

    componentDidMount() {
        this.loadTableData();
    }

    async delete(id) {
        const result = await request.delete('/commands/' + id);
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
            let result = await request.get('/commands/paging?' + paramsStr);
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

    handleSearchByContent = content => {
        let query = {
            ...this.state.queryParams,
            'pageIndex': 1,
            'pageSize': this.state.queryParams.pageSize,
            'content': content,
        }
        this.loadTableData(query);
    };

    showDeleteConfirm(id, content) {
        let self = this;
        confirm({
            title: '您确定要删除此指令吗?',
            content: content,
            okText: '确定',
            okType: 'danger',
            cancelText: '取消',
            onOk() {
                self.delete(id);
            }
        });
    };

    showModal(title, assets = null) {
        this.setState({
            modalTitle: title,
            modalVisible: true,
            model: assets
        });
    };

    handleCancelModal = e => {
        this.setState({
            modalTitle: '',
            modalVisible: false
        });
    };

    handleChecked = e => {
        let checkedAssets = this.state.checkedAssets;
        if (e.target.checked) {
            checkedAssets.push(e.target.value);
        } else {
            for (let i = 0; i < checkedAssets.length; i++) {
                if (checkedAssets[i].id === e.target.value.id) {
                    checkedAssets.splice(i, 1);
                }
            }
        }

        this.setState({
            checkedAssets: checkedAssets
        });
    };

    executeCommand = e => {
        let checkedAssets = this.state.checkedAssets;
        if (checkedAssets.length === 0) {
            message.warning('请至少选择一个资产');
            return;
        }

        let assets = checkedAssets.map(item => {
            return {
                id: item.id,
                name: item.name
            }
        });

        window.location.href = '#/batch-command?command=' + this.state.command + '&assets=' + JSON.stringify(assets);
    };

    handleOk = async (formData) => {
        // 弹窗 form 传来的数据
        this.setState({
            modalConfirmLoading: true
        });

        if (formData.id) {
            // 向后台提交数据
            const result = await request.put('/commands/' + formData.id, formData);
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
            const result = await request.post('/commands', formData);
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
            let result = await request.delete('/commands/' + this.state.selectedRowKeys.join(','));
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
            title: '指令名称',
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
            title: '指令内容',
            dataIndex: 'content',
            key: 'content',
            render: (content, record) => {
                let short = content;
                if (short && short.length > 20) {
                    short = short.substring(0, 20) + " ...";
                }

                return (
                    <Tooltip placement="topLeft" title={content}>
                        {short}
                    </Tooltip>
                );
            }
        }, {
            title: '操作',
            key: 'action',
            render: (text, record) => {

                return (
                    <div>
                        <Button type="link" size='small' icon={<EditTwoTone/>}
                                onClick={() => this.showModal('更新指令', record)}>编辑</Button>
                        <Button type="link" size='small' icon={<DeleteTwoTone/>}
                                onClick={() => this.showDeleteConfirm(record.id, record.name)}>删除</Button>
                        <Button type="link" size='small' icon={<CodeTwoTone/>} onClick={async () => {

                            this.setState({
                                assetsVisible: true,
                                command: record.content
                            });

                            let result = await request.get('/assets?protocol=ssh');
                            if (result.code === 1) {
                                this.setState({
                                    assets: result.data
                                });
                            } else {
                                message.error(result.message);
                            }
                        }}>执行</Button>

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
                    title="动态指令"
                    breadcrumb={{
                        routes: routes,
                        itemRender: itemRender
                    }}
                    extra={[
                        <Logout key='logout'/>
                    ]}
                    subTitle="批量动态指令执行"
                >
                </PageHeader>

                <Content className="site-layout-background page-content">

                    <div style={{marginBottom: 20}}>
                        <Row justify="space-around" align="middle" gutter={24}>
                            <Col span={12} key={1}>
                                <Title level={3}>指令列表</Title>
                            </Col>
                            <Col span={12} key={2} style={{textAlign: 'right'}}>
                                <Space>
                                    <Search
                                        ref={this.inputRefOfName}
                                        placeholder="指令名称"
                                        allowClear
                                        onSearch={this.handleSearchByName}
                                    />

                                    <Search
                                        ref={this.inputRefOfContent}
                                        placeholder="指令内容"
                                        allowClear
                                        onSearch={this.handleSearchByContent}
                                    />

                                    <Tooltip title='重置查询'>

                                        <Button icon={<UndoOutlined/>} onClick={() => {
                                            this.inputRefOfName.current.setValue('');
                                            this.inputRefOfContent.current.setValue('');
                                            this.loadTableData({pageIndex: 1, pageSize: 10, name: '', content: ''})
                                        }}>

                                        </Button>
                                    </Tooltip>

                                    <Divider type="vertical"/>

                                    <Tooltip title="新增">
                                        <Button type="dashed" icon={<PlusOutlined/>}
                                                onClick={() => this.showModal('新增指令', {})}>

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
                    />

                    {
                        this.state.modalVisible ?
                            <DynamicCommandModal
                                visible={this.state.modalVisible}
                                title={this.state.modalTitle}
                                handleOk={this.handleOk}
                                handleCancel={this.handleCancelModal}
                                confirmLoading={this.state.modalConfirmLoading}
                                model={this.state.model}
                            >

                            </DynamicCommandModal>
                            : null
                    }

                    <Modal
                        title="选择资产"
                        visible={this.state.assetsVisible}
                        onOk={this.executeCommand}
                        onCancel={() => {
                            this.setState({
                                assetsVisible: false
                            });
                        }}
                    >
                        {this.state.assets.map(item => {
                            return (<Checkbox key={item.id} value={item}
                                              onChange={this.handleChecked}>{item.name}</Checkbox>);
                        })}
                    </Modal>

                </Content>
            </>
        );
    }
}

export default DynamicCommand;
