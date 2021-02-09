import React, {Component} from 'react';

import {
    Button,
    Col,
    Divider,
    Input,
    Layout,
    Modal,
    notification,
    PageHeader,
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
import {differTime, formatDate, itemRender} from "../../utils/utils";
import {message} from "antd/es";
import {PROTOCOL_COLORS} from "../../common/constants";
import {DisconnectOutlined, ExclamationCircleOutlined, SyncOutlined, UndoOutlined} from "@ant-design/icons";
import Monitor from "../access/Monitor";
import Logout from "../user/Logout";

const confirm = Modal.confirm;
const {Content} = Layout;
const {Search} = Input;
const {Title, Text} = Typography;
const routes = [
    {
        path: '',
        breadcrumbName: '首页',
    },
    {
        path: 'onlineSession',
        breadcrumbName: '在线会话',
    }
];

class OnlineSession extends Component {

    inputRefOfClientIp = React.createRef();

    state = {
        items: [],
        total: 0,
        queryParams: {
            pageIndex: 1,
            pageSize: 10,
            protocol: '',
            userId: undefined,
            assetId: undefined
        },
        loading: false,
        selectedRowKeys: [],
        delBtnLoading: false,
        users: [],
        assets: [],
        accessVisible: false,
        sessionWidth: 1024,
        sessionHeight: 768,
        sessionProtocol: ''
    };

    componentDidMount() {
        this.loadTableData();
        this.handleSearchByNickname('');
        this.handleSearchByAssetName('');
    }

    async loadTableData(queryParams) {
        this.setState({
            loading: true
        });

        queryParams = queryParams || this.state.queryParams;
        queryParams['status'] = 'connected';

        // queryParams
        let paramsStr = qs.stringify(queryParams);

        let data = {
            items: [],
            total: 0
        };

        try {
            let result = await request.get('/sessions/paging?' + paramsStr);
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

    handleChangeByProtocol = protocol => {
        let query = {
            ...this.state.queryParams,
            'pageIndex': 1,
            'pageSize': this.state.queryParams.pageSize,
            'protocol': protocol,
        }
        this.loadTableData(query);
    }

    handleSearchByNickname = async nickname => {
        const result = await request.get(`/users/paging?pageIndex=1&pageSize=100&nickname=${nickname}`);
        if (result.code !== 1) {
            message.error(result.message, 10);
            return;
        }

        this.setState({
            users: result.data.items
        })
    }

    handleChangeByUserId = userId => {
        let query = {
            ...this.state.queryParams,
            'pageIndex': 1,
            'pageSize': this.state.queryParams.pageSize,
            'userId': userId,
        }
        this.loadTableData(query);
    }

    handleSearchByAssetName = async assetName => {
        const result = await request.get(`/assets/paging?pageIndex=1&pageSize=100&name=${assetName}`);
        if (result.code !== 1) {
            message.error(result.message, 10);
            return;
        }

        this.setState({
            assets: result.data.items
        })
    }

    handleChangeByAssetId = (assetId, options) => {
        let query = {
            ...this.state.queryParams,
            'pageIndex': 1,
            'pageSize': this.state.queryParams.pageSize,
            'assetId': assetId,
        }
        this.loadTableData(query);
    }

    batchDis = async () => {
        this.setState({
            delBtnLoading: true
        })
        try {
            let result = await request.post('/sessions/' + this.state.selectedRowKeys.join(',') + '/discontent');
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

    showMonitor = (record) => {

        this.setState({
            connectionId: record.connectionId,
            sessionProtocol: record.protocol,
            accessVisible: true,
            sessionWidth: record.width,
            sessionHeight: record.height,
            sessionTitle: `${record.username}@${record.ip}:${record.port} ${record.width}x${record.height}`
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
            title: '来源IP',
            dataIndex: 'clientIp',
            key: 'clientIp'
        }, {
            title: '用户昵称',
            dataIndex: 'creatorName',
            key: 'creatorName'
        }, {
            title: '资产名称',
            dataIndex: 'assetName',
            key: 'assetName'
        }, {
            title: '远程连接',
            dataIndex: 'access',
            key: 'access',
            render: (text, record) => {

                return `${record.username}@${record.ip}:${record.port}`;
            }
        }, {
            title: '连接协议',
            dataIndex: 'protocol',
            key: 'protocol',
            render: (text, record) => {

                return (<Tag color={PROTOCOL_COLORS[text]}>{text}</Tag>);
            }
        }, {
            title: '接入时间',
            dataIndex: 'connectedTime',
            key: 'connectedTime',
            render: (text, record) => {

                return formatDate(text, 'yyyy-MM-dd hh:mm:ss');
            }
        }, {
            title: '接入时长',
            dataIndex: 'connectedTime',
            key: 'connectedTime',
            render: (text, record) => {
                return differTime(new Date(record['connectedTime']), new Date());
            }
        },
            {
                title: '操作',
                key: 'action',
                render: (text, record) => {

                    return (
                        <div>
                            <Button type="link" size='small' onClick={() => {
                                this.showMonitor(record)
                            }}>监控</Button>
                            <Button type="link" size='small' onClick={async () => {

                                confirm({
                                    title: '您确定要断开此会话吗?',
                                    content: '',
                                    okText: '确定',
                                    okType: 'danger',
                                    cancelText: '取消',
                                    onOk() {
                                        dis(record.id)
                                    }
                                });

                                const dis = async (id) => {
                                    const result = await request.post(`/sessions/${id}/disconnect`);
                                    if (result.code === 1) {
                                        notification['success']({
                                            message: '提示',
                                            description: '断开成功',
                                        });
                                        this.loadTableData();
                                    } else {
                                        notification['success']({
                                            message: '提示',
                                            description: '断开失败 :( ' + result.message,
                                        });
                                    }
                                }

                            }}>断开</Button>
                        </div>
                    )
                },
            }
        ];

        const selectedRowKeys = this.state.selectedRowKeys;
        const rowSelection = {
            selectedRowKeys: selectedRowKeys,
            onChange: (selectedRowKeys, selectedRows) => {
                this.setState({selectedRowKeys});
            },
        };
        const hasSelected = selectedRowKeys.length > 0;

        const userOptions = this.state.users.map(d => <Select.Option key={d.id}
                                                                     value={d.id}>{d.nickname}</Select.Option>);
        const assetOptions = this.state.assets.map(d => <Select.Option key={d.id}
                                                                       value={d.id}>{d.name}</Select.Option>);

        return (
            <>
                <PageHeader
                    className="site-page-header-ghost-wrapper page-herder"
                    title="在线会话"
                    breadcrumb={{
                        routes: routes,
                        itemRender: itemRender
                    }}
                    extra={[
                        <Logout key='logout'/>
                    ]}
                    subTitle="查询实时在线会话"
                >
                </PageHeader>

                <Content className="site-layout-background page-content">

                    <div style={{marginBottom: 20}}>
                        <Row justify="space-around" align="middle" gutter={24}>
                            <Col span={8} key={1}>
                                <Title level={3}>在线会话列表</Title>
                            </Col>
                            <Col span={16} key={2} style={{textAlign: 'right'}}>
                                <Space>

                                    <Search
                                        ref={this.inputRefOfClientIp}
                                        placeholder="来源IP"
                                        allowClear
                                        onSearch={this.handleSearchByClientIp}
                                    />

                                    <Select
                                        style={{width: 150}}
                                        showSearch
                                        value={this.state.queryParams.userId}
                                        placeholder='用户昵称'
                                        onSearch={this.handleSearchByNickname}
                                        onChange={this.handleChangeByUserId}
                                        filterOption={false}
                                    >
                                        {userOptions}
                                    </Select>

                                    <Select
                                        style={{width: 150}}
                                        showSearch
                                        value={this.state.queryParams.assetId}
                                        placeholder='资产名称'
                                        onSearch={this.handleSearchByAssetName}
                                        onChange={this.handleChangeByAssetId}
                                        filterOption={false}
                                    >
                                        {assetOptions}
                                    </Select>

                                    <Select onChange={this.handleChangeByProtocol}
                                            value={this.state.queryParams.protocol ? this.state.queryParams.protocol : ''}
                                            style={{width: 100}}>
                                        <Select.Option value="">全部协议</Select.Option>
                                        <Select.Option value="rdp">rdp</Select.Option>
                                        <Select.Option value="ssh">ssh</Select.Option>
                                        <Select.Option value="vnc">vnc</Select.Option>
                                        <Select.Option value="telnet">telnet</Select.Option>
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

                                    <Tooltip title="批量断开">
                                        <Button type="primary" danger disabled={!hasSelected}
                                                icon={<DisconnectOutlined/>}
                                                loading={this.state.delBtnLoading}
                                                onClick={() => {
                                                    const content = <div>
                                                        您确定要断开选中的<Text style={{color: '#1890FF'}}
                                                                       strong>{this.state.selectedRowKeys.length}</Text>个会话吗？
                                                    </div>;
                                                    confirm({
                                                        icon: <ExclamationCircleOutlined/>,
                                                        content: content,
                                                        onOk: () => {
                                                            this.batchDis()
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
                               total: this.state.total,
                               showTotal: total => `总计 ${total} 条`
                           }}
                           loading={this.state.loading}
                    />

                    {
                        this.state.accessVisible ?
                            <Modal
                                className='monitor'
                                title={this.state.sessionTitle}
                                centered={true}
                                maskClosable={false}
                                visible={this.state.accessVisible}
                                footer={null}
                                width={window.innerWidth * 0.8}
                                height={window.innerWidth * 0.8 / this.state.sessionWidth * this.state.sessionHeight}
                                onCancel={() => {
                                    message.destroy();
                                    this.setState({accessVisible: false})
                                }}
                            >
                                <Monitor connectionId={this.state.connectionId}
                                         width={this.state.sessionWidth}
                                         height={this.state.sessionHeight}
                                         protocol={this.state.sessionProtocol}
                                         rate={window.innerWidth * 0.8 / this.state.sessionWidth}>

                                </Monitor>
                            </Modal> : undefined
                    }

                </Content>
            </>
        );
    }
}

export default OnlineSession;
