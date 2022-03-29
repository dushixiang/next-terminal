import React, {Component} from 'react';

import {
    Badge,
    Button,
    Col,
    Divider,
    Input,
    Layout,
    Popover,
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


import {PlusOutlined, SyncOutlined, UndoOutlined} from '@ant-design/icons';
import {PROTOCOL_COLORS} from "../../common/constants";
import {isEmpty} from "../../utils/utils";
import dayjs from "dayjs";

const {Search} = Input;
const {Content} = Layout;
const {Title} = Typography;

class UserShareSelectedAsset extends Component {

    inputRefOfName = React.createRef();
    inputRefOfIp = React.createRef();
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
        selectedRows: [],
        delBtnLoading: false,
        changeOwnerModalVisible: false,
        changeSharerModalVisible: false,
        changeOwnerConfirmLoading: false,
        changeSharerConfirmLoading: false,
        users: [],
        selected: {},
        totalSelectedRows: [],
        sharer: '',
        strategies: [],
        strategyId: undefined,
        sharers: []
    };

    async componentDidMount() {

        this.setState({
            sharer: this.props.sharer,
            userGroupId: this.props.userGroupId
        })

        this.init(this.props.sharer, this.props.userGroupId);
        this.loadTableData();
    }

    async init(sharer, userGroupId) {

        let params = {
            pageIndex: 1,
            pageSize: 1000,
            sharer: sharer,
            userGroupId: userGroupId
        }
        let paramStr = qs.stringify(params);
        let q1 = request.get(`/strategies`);
        let q2 = request.get(`/resource-sharers`);
        let q3 = request.get(`/assets/paging?${paramStr}`);
        let q4 = request.get('/tags');

        let r1 = await q1;
        let r2 = await q2;
        let r3 = await q3;
        let r4 = await q4;

        let strategies = [];
        if (r1['code'] === 1) {
            strategies = r1['data'];
            this.setState({
                strategies: strategies
            })
        }

        let sharers = [];
        if (r2['code'] === 1) {
            sharers = r2['data'];
            this.setState({
                sharers: sharers
            })
        }

        if (r3['code'] === 1) {
            let totalSelectedRows = r3['data']['items'];
            for (let i = 0; i < totalSelectedRows.length; i++) {
                let assetId = totalSelectedRows[i].id;
                totalSelectedRows[i]['strategy'] = this.getStrategyByAssetId(strategies, sharers, assetId);
            }
            this.setState({
                totalSelectedRows: totalSelectedRows
            })
        }

        if (r4['code'] === 1) {
            this.setState({
                tags: r4['data']
            })
        }
    }

    getStrategyByAssetId = (strategies, sharers, assetId, strategyId) => {
        if (strategyId === undefined) {
            for (let i = 0; i < sharers.length; i++) {
                if (sharers[i]['resourceId'] === assetId) {
                    strategyId = sharers[i]['strategyId'];
                    break;
                }
            }
        }
        if (strategyId) {
            for (let i = 0; i < strategies.length; i++) {
                if (strategies[i].id === strategyId) {
                    return strategies[i]
                }
            }
        }
        return undefined;
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
            let sharer = this.state.sharer;
            const items = data.items.map(item => {
                let disabled = false;
                if (sharer === item['owner']) {
                    disabled = true;
                }
                return {...item, 'key': item['id'], 'disabled': disabled}
            })
            let totalSelectedRows = this.state.totalSelectedRows;
            let selectedRowKeys = totalSelectedRows.map(item => item['id']);
            this.setState({
                items: items,
                total: data.total,
                queryParams: queryParams,
                loading: false,
                selectedRowKeys: selectedRowKeys
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

    unSelectRow = async (assetId) => {
        let userId = this.state.sharer;
        let userGroupId = this.state.userGroupId;
        let result = await request.post(`/resource-sharers/remove-resources`, {
            userGroupId: userGroupId,
            userId: userId,
            resourceType: 'asset',
            resourceIds: [assetId]
        });
        if (result['code'] === 1) {
            message.success('操作成功', 3);
        } else {
            message.error(result['message'], 10);
        }

        const selectedRowKeys = this.state.selectedRowKeys.filter(key => key !== assetId);
        const totalSelectedRows = this.state.totalSelectedRows.filter(item => item['id'] !== assetId);
        this.setState({
            selectedRowKeys: selectedRowKeys,
            totalSelectedRows: totalSelectedRows
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
            title: '资产名称',
            dataIndex: 'name',
            key: 'name',
            render: (name, record) => {
                let short = name;
                if (short && short.length > 15) {
                    short = short.substring(0, 15) + " ...";
                }
                return (
                    <Tooltip placement="topLeft" title={name}>
                        {short}
                    </Tooltip>
                );
            }
        }, {
            title: '协议',
            dataIndex: 'protocol',
            key: 'protocol',
            render: (text, record) => {
                const title = `${record['ip'] + ':' + record['port']}`
                return (
                    <Tooltip title={title}>
                        <Tag color={PROTOCOL_COLORS[text]}>{text}</Tag>
                    </Tooltip>
                )
            }
        }, {
            title: '标签',
            dataIndex: 'tags',
            key: 'tags',
            render: tags => {
                if (!isEmpty(tags)) {
                    let tagDocuments = []
                    let tagArr = tags.split(',');
                    for (let i = 0; i < tagArr.length; i++) {
                        if (tags[i] === '-') {
                            continue;
                        }
                        tagDocuments.push(<Tag key={tagArr[i]}>{tagArr[i]}</Tag>)
                    }
                    return tagDocuments;
                }
            }
        }, {
            title: '状态',
            dataIndex: 'active',
            key: 'active',
            render: text => {

                if (text) {
                    return (
                        <Tooltip title='运行中'>
                            <Badge status="processing" text='运行中'/>
                        </Tooltip>
                    )
                } else {
                    return (
                        <Tooltip title='不可用'>
                            <Badge status="error" text='不可用'/>
                        </Tooltip>
                    )
                }
            }
        }, {
            title: '所有者',
            dataIndex: 'ownerName',
            key: 'ownerName'
        }, {
            title: '创建日期',
            dataIndex: 'created',
            key: 'created',
            render: (text, record) => {
                return (
                    <Tooltip title={text}>
                        {dayjs(text).fromNow()}
                    </Tooltip>
                )
            }
        },
        ];

        const selectedRowKeys = this.state.selectedRowKeys;
        const rowSelection = {
            selectedRowKeys: this.state.selectedRowKeys,
            onChange: (selectedRowKeys, selectedRows) => {
                this.setState({selectedRowKeys, selectedRows});
            },
            getCheckboxProps: (record) => ({
                disabled: record['disabled'],
            }),
        };
        let hasSelected = false;
        if (selectedRowKeys.length > 0) {
            let totalSelectedRows = this.state.totalSelectedRows;
            let allSelectedRowKeys = totalSelectedRows.map(item => item['id']);
            for (let i = 0; i < selectedRowKeys.length; i++) {
                let selectedRowKey = selectedRowKeys[i];
                if (!allSelectedRowKeys.includes(selectedRowKey)) {
                    hasSelected = true;
                    break;
                }
            }
        }

        const renderStatus = (text) => {
            if (text === '1') {
                return <Tag color={'green'}>允许</Tag>
            } else {
                return <Tag color={'red'}>禁止</Tag>
            }
        }

        return (
            <>
                <Row gutter={16}>
                    <Col span={6}>
                        <Title level={3}>授权策略</Title>
                        <Select style={{minWidth: 200}} onChange={(strategyId) => {
                            this.setState({
                                'strategyId': strategyId
                            })
                        }}>
                            {this.state.strategies.map(item => {
                                return (
                                    <Select.Option key={item.id}>{item.name}</Select.Option>
                                );
                            })}
                        </Select>
                    </Col>
                    <Col span={18}>
                        <Title level={3}>已授权资产列表</Title>
                        <div>
                            {
                                this.state.totalSelectedRows.map(item => {
                                    let strategyName = '「未配置策略」';
                                    let content = '';
                                    if (item['strategy'] !== undefined) {
                                        strategyName = item['strategy']['name'];
                                        content = (
                                            <div>
                                                <p>上传：{renderStatus(item['strategy']['upload'])}</p>
                                                <p>下载：{renderStatus(item['strategy']['download'])}</p>
                                                <p>编辑：{renderStatus(item['strategy']['edit'])}</p>
                                                <p>删除：{renderStatus(item['strategy']['delete'])}</p>
                                                <p>重命名：{renderStatus(item['strategy']['rename'])}</p>
                                                <p>复制：{renderStatus(item['strategy']['copy'])}</p>
                                                <p>粘贴：{renderStatus(item['strategy']['paste'])}</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <Popover content={content} title={strategyName}>
                                            <Tag color={PROTOCOL_COLORS[item['protocol']]} closable
                                                 onClose={(e) => {
                                                     e.preventDefault()
                                                     this.unSelectRow(item['id'])
                                                 }}
                                                 key={item['id']}>{[item['name'], strategyName].join(':')}</Tag>
                                        </Popover>
                                    );
                                })
                            }
                        </div>
                    </Col>
                </Row>
                <Divider/>

                <Content key='page-content' className="site-layout-background">
                    <div style={{marginBottom: 20}}>
                        <Row justify="space-around" align="middle" gutter={24}>
                            <Col span={4} key={1}>
                                <Title level={3}>全部资产列表</Title>
                            </Col>
                            <Col span={20} key={2} style={{textAlign: 'right'}}>
                                <Space>

                                    <Search
                                        ref={this.inputRefOfName}
                                        placeholder="资产名称"
                                        allowClear
                                        onSearch={this.handleSearchByName}
                                        style={{width: 200}}
                                    />

                                    <Search
                                        ref={this.inputRefOfIp}
                                        placeholder="资产IP"
                                        allowClear
                                        onSearch={this.handleSearchByIp}
                                        style={{width: 200}}
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
                                            this.inputRefOfIp.current.setValue('');
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

                                    <Tooltip title="刷新列表">
                                        <Button icon={<SyncOutlined/>} onClick={() => {
                                            this.loadTableData(this.state.queryParams)
                                        }}>

                                        </Button>
                                    </Tooltip>

                                    <Tooltip title="添加授权">
                                        <Button type="primary" disabled={!hasSelected} icon={<PlusOutlined/>}
                                                onClick={async () => {
                                                    let totalSelectedRows = this.state.totalSelectedRows;
                                                    let totalSelectedRowKeys = totalSelectedRows.map(item => item['id']);

                                                    let selectedRows = this.state.selectedRows;
                                                    let newRowKeys = []
                                                    for (let i = 0; i < selectedRows.length; i++) {
                                                        let selectedRow = selectedRows[i];
                                                        if (totalSelectedRowKeys.includes(selectedRow['id'])) {
                                                            continue;
                                                        }
                                                        selectedRow['strategy'] = this.getStrategyByAssetId(this.state.strategies, this.state.sharers, selectedRow['id'], this.state.strategyId);
                                                        totalSelectedRows.push(selectedRow);
                                                        newRowKeys.push(selectedRow['id']);
                                                    }

                                                    let userId = this.state.sharer;
                                                    let userGroupId = this.state.userGroupId;
                                                    let strategyId = this.state.strategyId;
                                                    let result = await request.post(`/resource-sharers/add-resources`, {
                                                        userGroupId: userGroupId,
                                                        userId: userId,
                                                        strategyId: strategyId,
                                                        resourceType: 'asset',
                                                        resourceIds: newRowKeys
                                                    });
                                                    if (result['code'] === 1) {
                                                        message.success('操作成功', 3);
                                                        this.setState({
                                                            totalSelectedRows: totalSelectedRows
                                                        })
                                                        await this.loadTableData();
                                                    } else {
                                                        message.error(result['message'], 10);
                                                    }
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
                </Content>
            </>
        );
    }
}

export default UserShareSelectedAsset;
