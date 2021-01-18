import React, {Component} from 'react';

import {
    Badge,
    Button,
    Col,
    Divider,
    Drawer,
    Input,
    Layout,
    Modal,
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
import {message} from "antd/es";


import {DeleteOutlined, ExclamationCircleOutlined, PlusOutlined, SyncOutlined, UndoOutlined} from '@ant-design/icons';
import {PROTOCOL_COLORS} from "../../common/constants";
import UserShareChooseAsset from "./UserShareSelectAsset";

const confirm = Modal.confirm;
const {Search} = Input;
const {Content} = Layout;
const {Title, Text} = Typography;

class UserShareAsset extends Component {

    inputRefOfName = React.createRef();
    changeOwnerFormRef = React.createRef();

    state = {
        items: [],
        total: 0,
        queryParams: {
            pageIndex: 1,
            pageSize: 10,
            protocol: ''
        },
        loading: false,
        tags: [],
        model: {},
        selectedRowKeys: [],
        delBtnLoading: false,
        changeOwnerModalVisible: false,
        changeSharerModalVisible: false,
        changeOwnerConfirmLoading: false,
        changeSharerConfirmLoading: false,
        users: [],
        selected: {},
        selectedSharers: [],
        chooseAssetVisible: false
    };

    async componentDidMount() {
        let sharer = this.props.sharer;
        this.loadTableData({sharer: sharer});

        let result = await request.get('/tags');
        if (result['code'] === 1) {
            this.setState({
                tags: result['data']
            })
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
            let result = await request.get('/assets/paging?' + paramsStr);
            if (result['code'] === 1) {
                data = result['data'];
            } else {
                message.error(result['message']);
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

    handleTagsChange = tags => {
        console.log(tags)
        // this.setState({
        //     tags: tags
        // })
        let query = {
            ...this.state.queryParams,
            'pageIndex': 1,
            'pageSize': this.state.queryParams.pageSize,
            'tags': tags.join(','),
        }

        this.loadTableData(query);
    }

    handleSearchByProtocol = protocol => {
        let query = {
            ...this.state.queryParams,
            'pageIndex': 1,
            'pageSize': this.state.queryParams.pageSize,
            'protocol': protocol,
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
            title: '资产名称',
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
            title: '网络',
            dataIndex: 'ip',
            key: 'ip',
            render: (text, record) => {

                return record['ip'] + ':' + record['port'];
            }
        }, {
            title: '连接协议',
            dataIndex: 'protocol',
            key: 'protocol',
            render: (text, record) => {

                return (<Tag color={PROTOCOL_COLORS[text]}>{text}</Tag>);
            }
        }, {
            title: '状态',
            dataIndex: 'active',
            key: 'active',
            render: text => {
                if (text) {
                    return (<Badge status="processing" text="运行中"/>);
                } else {
                    return (<Badge status="error" text="不可用"/>);
                }
            }
        }, {
            title: '所有者',
            dataIndex: 'ownerName',
            key: 'ownerName'
        }, {
            title: '创建日期',
            dataIndex: 'created',
            key: 'created'
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
                <Content key='page-content' className="site-layout-background">
                    <div style={{marginBottom: 20}}>
                        <Row justify="space-around" align="middle" gutter={24}>
                            <Col span={8} key={1}>
                                <Title level={3}>授权资产列表</Title>
                            </Col>
                            <Col span={16} key={2} style={{textAlign: 'right'}}>
                                <Space>

                                    <Search
                                        ref={this.inputRefOfName}
                                        placeholder="资产名称"
                                        allowClear
                                        onSearch={this.handleSearchByName}
                                    />

                                    <Select mode="multiple"
                                            allowClear
                                            placeholder="资产标签" onChange={this.handleTagsChange}
                                            style={{minWidth: 150}}>
                                        {this.state.tags.map(tag => {
                                            if (tag === '-') {
                                                return undefined;
                                            }
                                            return (<Select.Option key={tag}>{tag}</Select.Option>)
                                        })}
                                    </Select>

                                    <Select onChange={this.handleSearchByProtocol}
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
                                            this.inputRefOfName.current.setValue('');
                                            this.loadTableData({
                                                ...this.state.queryParams,
                                                pageIndex: 1,
                                                pageSize: 10,
                                                protocol: ''
                                            })
                                        }}>

                                        </Button>
                                    </Tooltip>

                                    <Divider type="vertical"/>

                                    <Tooltip title="添加授权资产">
                                        <Button type="dashed" icon={<PlusOutlined/>}
                                                onClick={() => {
                                                    this.setState({
                                                        chooseAssetVisible: true
                                                    })
                                                }}>

                                        </Button>
                                    </Tooltip>

                                    <Tooltip title="刷新列表">
                                        <Button icon={<SyncOutlined/>} onClick={() => {
                                            this.loadTableData(this.state.queryParams)
                                        }}>

                                        </Button>
                                    </Tooltip>

                                    <Tooltip title="移除授权资产">
                                        <Button type="dashed" danger disabled={!hasSelected} icon={<DeleteOutlined/>}
                                                loading={this.state.delBtnLoading}
                                                onClick={() => {
                                                    const content = <div>
                                                        您确定要移除选中的<Text style={{color: '#1890FF'}}
                                                                       strong>{this.state.selectedRowKeys.length}</Text>条授权记录吗？
                                                    </div>;
                                                    confirm({
                                                        icon: <ExclamationCircleOutlined/>,
                                                        content: content,
                                                        onOk: async () => {
                                                            let userId = this.state.queryParams.sharer;
                                                            let result = await request.post(`/resource-sharers/remove-resources`, {
                                                                userId: userId,
                                                                resourceType: 'asset',
                                                                resourceIds: this.state.selectedRowKeys
                                                            });
                                                            if (result['code'] === 1) {
                                                                message.success('操作成功', 3);
                                                                this.setState({
                                                                    selectedRowKeys: []
                                                                })
                                                                await this.loadTableData();
                                                            } else {
                                                                message.error(result['message'], 10);
                                                            }
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

                    <Table key='assets-table'
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

                    {this.state.chooseAssetVisible ?
                        <Drawer
                            title="添加授权资产"
                            placement="right"
                            closable={true}
                            onClose={() => {
                                this.loadTableData()
                                this.setState({
                                    chooseAssetVisible: false
                                })
                            }}
                            visible={this.state.chooseAssetVisible}
                            width={window.innerWidth * 0.8}
                        >
                            <UserShareChooseAsset
                                sharer={this.state.queryParams.sharer}
                            >

                            </UserShareChooseAsset>
                        </Drawer> : undefined
                    }

                </Content>
            </>
        );
    }
}

export default UserShareAsset;
