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
import {differTime} from "../../utils/utils";
import Playback from "./Playback";
import {message} from "antd/es";
import {
    CheckOutlined,
    ClearOutlined,
    DeleteOutlined,
    ExclamationCircleOutlined, EyeInvisibleOutlined, EyeOutlined,
    SyncOutlined,
    UndoOutlined
} from "@ant-design/icons";
import {MODE_COLORS, PROTOCOL_COLORS} from "../../common/constants";
import './OfflineSession.css'
import dayjs from "dayjs";

const confirm = Modal.confirm;
const {Content} = Layout;
const {Search} = Input;
const {Title, Text} = Typography;

class OfflineSession extends Component {

    inputRefOfClientIp = React.createRef();

    state = {
        items: [],
        total: 0,
        queryParams: {
            pageIndex: 1,
            pageSize: 10,
            protocol: '',
            userId: undefined,
            assetId: undefined,
            reviewed: undefined
        },
        loading: false,
        playbackVisible: false,
        playbackSessionId: null,
        videoPlayerVisible: false,
        videoPlayerSource: null,
        selectedRowKeys: [],
        delBtnLoading: false,
        users: [],
        assets: [],
        selectedRow: {},
    };

    componentDidMount() {
        this.loadTableData();
        this.handleSearchByNickname('');
        this.handleSearchByAssetName('');
    }

    async loadTableData(queryParams) {
        queryParams = queryParams || this.state.queryParams;
        queryParams['status'] = 'disconnected';

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

    showPlayback = (row) => {
        this.setState({
            playbackVisible: true,
            selectedRow: row
        });
    };

    hidePlayback = () => {
        this.setState({
            playbackVisible: false,
            playbackSessionId: null
        });
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

    handleChangeByRead = reviewed => {
        let query = {
            ...this.state.queryParams,
            'pageIndex': 1,
            'pageSize': this.state.queryParams.pageSize,
            'reviewed': reviewed,
        }
        this.loadTableData(query);
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

    batchDelete = async () => {
        this.setState({
            delBtnLoading: true
        })
        try {
            let result = await request.delete('/sessions/' + this.state.selectedRowKeys.join(','));
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

    handleAllReviewed = async () => {
        this.setState({
            reviewedAllBtnLoading: true
        })
        try {
            let result = await request.post(`/sessions/reviewed`);
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
                reviewedAllBtnLoading: false
            })
        }
    }

    handleReviewed = async () => {
        this.setState({
            reviewedBtnLoading: true
        })
        try {
            let result = await request.post(`/sessions/${this.state.selectedRowKeys.join(',')}/reviewed`);
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
                reviewedBtnLoading: false
            })
        }
    }

    handleUnreviewed = async () => {
        this.setState({
            unreviewedBtnLoading: true
        })
        try {
            let result = await request.post(`/sessions/${this.state.selectedRowKeys.join(',')}/unreviewed`);
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
                unreviewedBtnLoading: false
            })
        }
    }

    del = async (id) => {
        const result = await request.delete(`/sessions/${id}`);
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

    clearSession = async () => {
        this.setState({
            clearBtnLoading: true
        })
        try {
            let result = await request.post('/sessions/clear');
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
            },
        }, {
            title: '来源IP',
            dataIndex: 'clientIp',
            key: 'clientIp'
        }, {
            title: '接入方式',
            dataIndex: 'mode',
            key: 'mode',
            render: (text) => {
                return (
                    <Tag color={MODE_COLORS[text]}>{text}</Tag>
                )
            }
        }, {
            title: '用户昵称',
            dataIndex: 'creatorName',
            key: 'creatorName'
        }, {
            title: '资产名称',
            dataIndex: 'assetName',
            key: 'assetName'
        }, {
            title: '连接协议',
            dataIndex: 'protocol',
            key: 'protocol',
            render: (text, record) => {
                const title = `${record.username}@${record.ip}:${record.port}`;
                return (
                    <Tooltip title={title}>
                        <Tag color={PROTOCOL_COLORS[text]}>{text}</Tag>
                    </Tooltip>
                )
            }
        }, {
            title: '接入时间',
            dataIndex: 'connectedTime',
            key: 'connectedTime',
            render: (text, record) => {
                return (
                    <Tooltip title={text}>
                        {dayjs(text).fromNow()}
                    </Tooltip>
                )
            }
        }, {
            title: '接入时长',
            dataIndex: 'connectedTime',
            key: 'connectedTime',
            render: (text, record) => {
                return differTime(new Date(record['connectedTime']), new Date(record['disconnectedTime']));
            }
        },
            {
                title: '操作',
                key: 'action',
                render: (text, record) => {
                    let disabled = true;
                    if (record['recording'] && record['recording'] === '1') {
                        disabled = false
                    }

                    return (
                        <div>
                            <Button type="link" size='small'
                                    disabled={disabled}
                                    onClick={() => this.showPlayback(record)}>回放</Button>
                            <Button type="link" size='small'
                                    onClick={() => {
                                        confirm({
                                            title: '您确定要禁止该IP访问本系统吗?',
                                            content: '',
                                            okText: '确定',
                                            okType: 'danger',
                                            cancelText: '取消',
                                            onOk: async () => {
                                                // 向后台提交数据
                                                let formData = {
                                                    ip: record['clientIp'],
                                                    rule: 'reject',
                                                    priority: 99,
                                                }
                                                const result = await request.post('/securities', formData);
                                                if (result.code === 1) {
                                                    message.success('禁用成功');
                                                } else {
                                                    message.error(result.message, 10);
                                                }
                                            }
                                        });
                                    }}>禁用IP</Button>
                            <Button type="link" size='small' danger onClick={() => {
                                confirm({
                                    title: '您确定要删除此会话吗?',
                                    content: '',
                                    okText: '确定',
                                    okType: 'danger',
                                    cancelText: '取消',
                                    onOk: () => {
                                        this.del(record.id)
                                    }
                                });
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

        const userOptions = this.state.users.map(d => <Select.Option key={d.id}
                                                                     value={d.id}>{d.nickname}</Select.Option>);
        const assetOptions = this.state.assets.map(d => <Select.Option key={d.id}
                                                                       value={d.id}>{d.name}</Select.Option>);

        return (
            <>
                <Content className="site-layout-background page-content">
                    <div style={{marginBottom: 20}}>
                        <Row justify="space-around" align="middle" gutter={24}>
                            <Col span={4} key={1}>
                                <Title level={3}>离线会话列表</Title>
                            </Col>
                            <Col span={20} key={2} style={{textAlign: 'right'}}>
                                <Space>

                                    <Search
                                        ref={this.inputRefOfClientIp}
                                        placeholder="来源IP"
                                        allowClear
                                        onSearch={this.handleSearchByClientIp}
                                    />

                                    <Select
                                        style={{width: 140}}
                                        showSearch
                                        value={this.state.queryParams.userId}
                                        placeholder='用户昵称'
                                        onSearch={this.handleSearchByNickname}
                                        onChange={this.handleChangeByUserId}
                                        filterOption={false}
                                        allowClear
                                    >
                                        {userOptions}
                                    </Select>

                                    <Select
                                        style={{width: 140}}
                                        showSearch
                                        value={this.state.queryParams.assetId}
                                        placeholder='资产名称'
                                        onSearch={this.handleSearchByAssetName}
                                        onChange={this.handleChangeByAssetId}
                                        filterOption={false}
                                    >
                                        {assetOptions}
                                    </Select>

                                    <Select onChange={this.handleChangeByRead}
                                            value={this.state.queryParams.reviewed ? this.state.queryParams.reviewed : ''}
                                            style={{width: 100}}>
                                        <Select.Option value="">全部会话</Select.Option>
                                        <Select.Option value="true">只看已读</Select.Option>
                                        <Select.Option value="false">只看未读</Select.Option>
                                    </Select>

                                    <Select onChange={this.handleChangeByProtocol}
                                            value={this.state.queryParams.protocol ? this.state.queryParams.protocol : ''}
                                            style={{width: 100}}>
                                        <Select.Option value="">全部协议</Select.Option>
                                        <Select.Option value="rdp">rdp</Select.Option>
                                        <Select.Option value="ssh">ssh</Select.Option>
                                        <Select.Option value="vnc">vnc</Select.Option>
                                        <Select.Option value="telnet">telnet</Select.Option>
                                        <Select.Option value="kubernetes">kubernetes</Select.Option>
                                    </Select>

                                    <Tooltip title='重置查询'>

                                        <Button icon={<UndoOutlined/>} onClick={() => {
                                            this.inputRefOfClientIp.current.setValue('');
                                            this.loadTableData({
                                                pageIndex: 1,
                                                pageSize: 10,
                                                protocol: ''
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

                                    <Tooltip title="全部标为已阅">
                                        <Button icon={<CheckOutlined />}
                                                loading={this.state.reviewedAllBtnLoading}
                                                onClick={this.handleAllReviewed}>
                                        </Button>
                                    </Tooltip>

                                    <Tooltip title="标为已阅">
                                        <Button disabled={!hasSelected} icon={<EyeOutlined />}
                                                loading={this.state.reviewedBtnLoading}
                                                onClick={this.handleReviewed}>

                                        </Button>
                                    </Tooltip>

                                    <Tooltip title="标为未阅">
                                        <Button disabled={!hasSelected} icon={<EyeInvisibleOutlined />}
                                                loading={this.state.unreviewedBtnLoading}
                                                onClick={this.handleUnreviewed}>

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

                                    <Tooltip title="清空">
                                        <Button type="primary" danger icon={<ClearOutlined/>}
                                                loading={this.state.clearBtnLoading}
                                                onClick={() => {
                                                    const content = <Text style={{color: 'red'}}
                                                                          strong>您确定要清空全部的离线会话吗？</Text>;
                                                    confirm({
                                                        icon: <ExclamationCircleOutlined/>,
                                                        content: content,
                                                        okType: 'danger',
                                                        onOk: this.clearSession,
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
                           rowClassName={(record, index) => {
                               return record['reviewed'] ? '' : 'unreviewed';
                           }}
                    />

                    {
                        this.state.playbackVisible ?
                            <Modal
                                className='modal-no-padding'
                                title={`会话回放 来源IP：${this.state.selectedRow['clientIp']} 用户昵称：${this.state.selectedRow['creatorName']} 资产名称：${this.state.selectedRow['assetName']} 网络：${this.state.selectedRow['username']}@${this.state.selectedRow['ip']}:${this.state.selectedRow['port']}`}
                                centered={true}
                                visible={this.state.playbackVisible}
                                onCancel={this.hidePlayback}
                                width={window.innerWidth * 0.8}
                                footer={null}
                                destroyOnClose
                                maskClosable={false}
                            >
                                {
                                    this.state.selectedRow['mode'] === 'native' || this.state.selectedRow['mode'] === 'terminal' ?
                                        <iframe
                                            title='recording'
                                            style={{
                                                width: '100%',
                                                // height: this.state.iFrameHeight,
                                                overflow: 'visible'
                                            }}
                                            onLoad={() => {
                                                // constant obj = ReactDOM.findDOMNode(this);
                                                // this.setState({
                                                //     "iFrameHeight": obj.contentWindow.document.body.scrollHeight + 'px'
                                                // });
                                            }}
                                            ref="iframe"
                                            src={'./asciinema.html?sessionId=' + this.state.selectedRow['id']}
                                            width="100%"
                                            height={window.innerHeight * 0.8}
                                            frameBorder="0"
                                        />
                                        : <Playback sessionId={this.state.selectedRow['id']}/>
                                }

                            </Modal> : undefined
                    }

                </Content>
            </>
        );
    }
}

export default OfflineSession;
