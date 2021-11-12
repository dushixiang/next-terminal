import React, {Component} from 'react';

import {
    Button,
    Col,
    Divider,
    Input,
    Layout,
    Modal,
    notification,
    Row,
    Select,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography
} from "antd";
import qs from "qs";
import request from "../../common/request";
import {formatDate, isEmpty} from "../../utils/utils";
import {message} from "antd/es";
import {ClearOutlined, DeleteOutlined, ExclamationCircleOutlined, SyncOutlined, UndoOutlined} from "@ant-design/icons";


const confirm = Modal.confirm;
const {Content} = Layout;
const {Search} = Input;
const {Title, Text} = Typography;

class LoginLog extends Component {

    inputRefOfClientIp = React.createRef();

    state = {
        items: [],
        total: 0,
        queryParams: {
            pageIndex: 1,
            pageSize: 10,
            userId: undefined,
        },
        loading: false,
        selectedRowKeys: [],
        delBtnLoading: false,
        users: [],
    };

    componentDidMount() {
        this.loadTableData();
    }

    async loadTableData(queryParams) {
        queryParams = queryParams || this.state.queryParams;

        this.setState({
            queryParams: queryParams,
            loading: true
        });

        // queryParams
        let paramsStr = qs.stringify(queryParams);

        let data = {
            items: [],
            total: 0
        };

        try {
            let result = await request.get('/login-logs/paging?' + paramsStr);
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

    handleSearchByClientIp = clientIp => {
        let query = {
            ...this.state.queryParams,
            'pageIndex': 1,
            'pageSize': this.state.queryParams.pageSize,
            'clientIp': clientIp,
        }
        this.loadTableData(query);
    }

    handleSearchByUsername = username => {
        let query = {
            ...this.state.queryParams,
            'pageIndex': 1,
            'pageSize': this.state.queryParams.pageSize,
            'username': username,
        }
        this.loadTableData(query);
    }

    handleChangeByState = (state) => {
        let query = {
            ...this.state.queryParams,
            'pageIndex': 1,
            'pageSize': this.state.queryParams.pageSize,
            'state': state,
        }
        this.loadTableData(query);
    }

    batchDelete = async () => {
        this.setState({
            delBtnLoading: true
        })
        try {
            let result = await request.delete('/login-logs/' + this.state.selectedRowKeys.join(','));
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

    clearLoginLogs = async () => {
        this.setState({
            clearBtnLoading: true
        })
        try {
            let result = await request.post('/login-logs/clear');
            if (result.code === 1) {
                message.success('操作成功，即将跳转至登录页面。', 3);
                this.setState({
                    selectedRowKeys: []
                })
                setTimeout(function () {
                    window.location.reload();
                }, 3000);
            } else {
                message.error(result.message, 10);
            }
        } finally {
            this.setState({
                clearBtnLoading: false
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
            title: '登录账号',
            dataIndex: 'username',
            key: 'username'
        }, {
            title: '登录IP',
            dataIndex: 'clientIp',
            key: 'clientIp'
        }, {
            title: '登录状态',
            dataIndex: 'state',
            key: 'state',
            render: text => {
                if (text === '0') {
                    return <Tag color="error">失败</Tag>
                } else {
                    return <Tag color="success">成功</Tag>
                }
            }
        }, {
            title: '失败原因',
            dataIndex: 'reason',
            key: 'reason'
        }, {
            title: '浏览器',
            dataIndex: 'clientUserAgent',
            key: 'clientUserAgent',
            render: (text, record) => {
                if (isEmpty(text)) {
                    return '未知';
                }
                return (
                    <Tooltip placement="topLeft" title={text}>
                        {text.split(' ')[0]}
                    </Tooltip>
                )
            }
        }, {
            title: '登录时间',
            dataIndex: 'loginTime',
            key: 'loginTime',
            render: (text, record) => {

                return formatDate(text, 'yyyy-MM-dd hh:mm:ss');
            }
        }, {
            title: '注销时间',
            dataIndex: 'logoutTime',
            key: 'logoutTime',
            render: (text, record) => {
                if (isEmpty(text) || text === '0001-01-01 00:00:00') {
                    return '';
                }
                return text;
            }
        },
            {
                title: '操作',
                key: 'action',
                render: (text, record) => {
                    return (
                        <div>
                            <Button type="link" size='small' onClick={() => {
                                confirm({
                                    title: '您确定要删除此条登录日志吗?',
                                    content: '删除用户未注销的登录日志将会强制用户下线',
                                    okText: '确定',
                                    okType: 'danger',
                                    cancelText: '取消',
                                    onOk() {
                                        del(record.id)
                                    }
                                });

                                const del = async (id) => {
                                    const result = await request.delete(`/login-logs/${id}`);
                                    if (result.code === 1) {
                                        notification['success']({
                                            message: '提示',
                                            description: '删除成功',
                                        });
                                        this.loadTableData();
                                    } else {
                                        notification['error']({
                                            message: '提示',
                                            description: result.message,
                                        });
                                    }

                                }
                            }}>删除</Button>
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
                            <Col span={8} key={1}>
                                <Title level={3}>登录日志列表</Title>
                            </Col>
                            <Col span={16} key={2} style={{textAlign: 'right'}}>
                                <Space>

                                    <Search
                                        ref={this.inputRefOfClientIp}
                                        placeholder="登录账号"
                                        allowClear
                                        onSearch={this.handleSearchByUsername}
                                    />

                                    <Search
                                        ref={this.inputRefOfClientIp}
                                        placeholder="登录IP"
                                        allowClear
                                        onSearch={this.handleSearchByClientIp}
                                    />

                                    <Select
                                        style={{width: 100}}
                                        placeholder='用户昵称'
                                        onChange={this.handleChangeByState}
                                        defaultValue={''}
                                    >
                                        <Select.Option value=''>全部状态</Select.Option>
                                        <Select.Option value='1'>只看成功</Select.Option>
                                        <Select.Option value='0'>只看失败</Select.Option>
                                    </Select>

                                    <Tooltip title='重置查询'>

                                        <Button icon={<UndoOutlined/>} onClick={() => {
                                            this.inputRefOfClientIp.current.setValue('');
                                            this.loadTableData({
                                                pageIndex: 1,
                                                pageSize: 10,
                                                protocol: '',
                                                userId: undefined,
                                                assetId: undefined
                                            })
                                        }}>

                                        </Button>
                                    </Tooltip>

                                    <Divider type="vertical"/>

                                    <Tooltip title="刷新列表">
                                        <Button icon={<SyncOutlined/>} onClick={() => {
                                            this.loadTableData(this.state.queryParams)
                                        }}>

                                        </Button>
                                    </Tooltip>

                                    <Tooltip title="批量删除">
                                        <Button type="dashed" danger disabled={!hasSelected} icon={<DeleteOutlined/>}
                                                loading={this.state.delBtnLoading}
                                                onClick={() => {
                                                    const content = <div>
                                                        您确定要删除选中的<Text style={{color: '#1890FF'}}
                                                                       strong>{this.state.selectedRowKeys.length}</Text>条记录吗？
                                                    </div>;
                                                    confirm({
                                                        icon: <ExclamationCircleOutlined/>,
                                                        title: content,
                                                        content: '删除用户未注销的登录日志将会强制用户下线',
                                                        onOk: () => {
                                                            this.batchDelete()
                                                        },
                                                        onCancel() {

                                                        },
                                                    });
                                                }}>

                                        </Button>
                                    </Tooltip>

                                    <Tooltip title="清空">
                                        <Button type="primary" danger icon={<ClearOutlined/>}
                                                loading={this.state.clearBtnLoading}
                                                onClick={() => {
                                                    const title = <Text style={{color: 'red'}}
                                                                        strong>您确定要清空全部的登录日志吗？</Text>;
                                                    confirm({
                                                        icon: <ExclamationCircleOutlined/>,
                                                        title: title,
                                                        content: '删除用户未注销的登录日志将会强制用户下线，当前登录的用户也会退出登录。',
                                                        okType: 'danger',
                                                        onOk: this.clearLoginLogs,
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
                               total: this.state.total,
                               showTotal: total => `总计 ${total} 条`
                           }}
                           loading={this.state.loading}
                    />
                </Content>
            </>
        );
    }
}

export default LoginLog;
