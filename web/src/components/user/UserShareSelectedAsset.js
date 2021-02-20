import React, {Component} from 'react';

import {Badge, Button, Col, Divider, Input, Layout, Row, Select, Space, Table, Tag, Tooltip, Typography} from "antd";
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
        sharer: ''
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
        let q1 = request.get('/tags');
        let q2 = request.get(`/assets/paging?${paramStr}`);

        let r1 = await q1;
        let r2 = await q2;

        if (r1['code'] === 1) {
            this.setState({
                tags: r1['data']
            })
        }

        if (r2['code'] === 1) {
            this.setState({
                totalSelectedRows: r2['data']['items']
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
            title: '连接协议',
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
                        tagDocuments.push(<Tag>{tagArr[i]}</Tag>)
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
                            <Badge status="processing"/>
                        </Tooltip>
                    )
                } else {
                    return (
                        <Tooltip title='不可用'>
                            <Badge status="error"/>
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

        return (
            <>
                <Title level={3}>授权资产列表</Title>
                <div>
                    {
                        this.state.totalSelectedRows.map(item => {
                            return <Tag color={PROTOCOL_COLORS[item['protocol']]} closable
                                        onClose={() => this.unSelectRow(item['id'])}
                                        key={item['id']}>{item['name']}</Tag>
                        })
                    }
                </div>

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
                                                    console.log(this.state.selectedRows)
                                                    let totalSelectedRows = this.state.totalSelectedRows;
                                                    let totalSelectedRowKeys = totalSelectedRows.map(item => item['id']);

                                                    let selectedRows = this.state.selectedRows;
                                                    let newRowKeys = []
                                                    for (let i = 0; i < selectedRows.length; i++) {
                                                        let selectedRow = selectedRows[i];
                                                        if (totalSelectedRowKeys.includes(selectedRow['id'])) {
                                                            continue;
                                                        }
                                                        totalSelectedRows.push(selectedRow);
                                                        newRowKeys.push(selectedRow['id']);
                                                    }

                                                    let userId = this.state.sharer;
                                                    let userGroupId = this.state.userGroupId;
                                                    let result = await request.post(`/resource-sharers/add-resources`, {
                                                        userGroupId: userGroupId,
                                                        userId: userId,
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
