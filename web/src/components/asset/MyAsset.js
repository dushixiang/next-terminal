import React, {Component} from 'react';
import {
    Button,
    Card,
    Col,
    Descriptions,
    Divider,
    Input,
    Layout,
    List,
    Row,
    Select,
    Space,
    Tag,
    Tooltip,
    Typography
} from "antd";
import {
    CheckCircleOutlined,
    CodeOutlined,
    DesktopOutlined,
    ExclamationCircleOutlined,
    SyncOutlined,
    TagsOutlined,
    UndoOutlined
} from "@ant-design/icons";
import request from "../../common/request";
import {message} from "antd/es";
import qs from "qs";

const {Content} = Layout;
const {Title} = Typography;
const {Search} = Input;

class MyAsset extends Component {

    inputRefOfName = React.createRef();
    inputRefOfIp = React.createRef();

    state = {
        items: [],
        tags: [],
        queryParams: {
            pageIndex: 1,
            pageSize: 8,
            protocol: '',
            tags: ''
        },
        loading: false,
    }

    async componentDidMount() {
        this.loadTableData();
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
            let result = await request.get('/account/assets?' + paramsStr);
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

    renderTags(tags) {
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
        this.setState({
            selectedTags: tags
        })
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

    handleChangPage = async (pageIndex, pageSize) => {
        let queryParams = this.state.queryParams;
        queryParams.pageIndex = pageIndex;
        queryParams.pageSize = pageSize;

        this.setState({
            queryParams: queryParams
        });

        await this.loadTableData(queryParams)
    };

    handleTableChange = (pagination, filters, sorter) => {
        let query = {
            ...this.state.queryParams,
            'order': sorter.order,
            'field': sorter.field
        }

        this.loadTableData(query);
    }

    render() {
        return (
            <div style={{marginTop: 20}}>
                <Content style={{background: 'white', padding: 24}}>
                    <div>
                        <Row justify="space-around" align="middle" gutter={24}>
                            <Col span={4} key={1}>
                                <Title level={3}>我的资产</Title>
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
                                            value={this.state.selectedTags}
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
                                        <Select.Option value="kubernetes">kubernetes</Select.Option>
                                    </Select>

                                    <Tooltip title='重置查询'>

                                        <Button icon={<UndoOutlined/>} onClick={() => {
                                            this.inputRefOfName.current.setValue('');
                                            this.inputRefOfIp.current.setValue('');
                                            this.setState({
                                                selectedTags: []
                                            })
                                            this.loadTableData({pageIndex: 1, pageSize: 10, protocol: '', tags: ''})
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

                                </Space>
                            </Col>
                        </Row>
                    </div>

                </Content>

                <div style={{marginTop: 20}}>
                    <List
                        loading={this.state.loading}
                        grid={{gutter: 16, column: 4}}
                        dataSource={this.state.items}
                        pagination={{
                            showSizeChanger: true,
                            current: this.state.queryParams.pageIndex,
                            pageSize: this.state.queryParams.pageSize,
                            onChange: this.handleChangPage,
                            onShowSizeChange: this.handleChangPage,
                            total: this.state.total,
                            showTotal: total => `总计 ${total} 条`,
                            pageSizeOptions: [8, 16, 32, 64, 128]
                        }}
                        renderItem={item => {

                            const id = item['id'];
                            const protocol = item['protocol'];
                            const name = item['name'];
                            const sshMode = item['sshMode'];
                            let url = '';
                            if (protocol === 'ssh' && sshMode === 'native') {
                                url = `#/term?assetId=${id}&assetName=${name}`;
                            } else {
                                url = `#/access?assetId=${id}&assetName=${name}&protocol=${protocol}`;
                            }

                            return (
                                <List.Item>
                                    <a target='_blank' href={url} rel='noreferrer noopener'>
                                        <Card title={item['name']}
                                              hoverable
                                              extra={item['active'] ?
                                                  <Tag icon={<CheckCircleOutlined/>} color="success">
                                                      运行中
                                                  </Tag> : <Tag icon={<ExclamationCircleOutlined/>} color="error">
                                                      不可用
                                                  </Tag>}
                                              actions={[]}>
                                            <Descriptions title="" column={1}>
                                                <Descriptions.Item label={<div><CodeOutlined/> 资产协议</div>}>
                                                    <strong>{item['protocol']}</strong>
                                                </Descriptions.Item>
                                                <Descriptions.Item label={<div><DesktopOutlined/> 主机地址</div>}>
                                                    <strong>{item['ip'] + ':' + item['port']}</strong>
                                                </Descriptions.Item>
                                                <Descriptions.Item label={<div><TagsOutlined/> 标签</div>}>
                                                    <strong>{this.renderTags(item['tags'])}</strong>
                                                </Descriptions.Item>
                                            </Descriptions>
                                        </Card>
                                    </a>
                                </List.Item>
                            )
                        }}
                    />
                </div>
            </div>
        );
    }
}

export default MyAsset;