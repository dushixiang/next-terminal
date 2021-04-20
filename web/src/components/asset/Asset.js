import React, {Component} from 'react';

import {
    Alert,
    Badge,
    Button,
    Col,
    Divider,
    Dropdown,
    Form,
    Input,
    Layout,
    Menu,
    Modal,
    notification,
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
import AssetModal from "./AssetModal";
import request from "../../common/request";
import {message} from "antd/es";
import {getHeaders, isEmpty} from "../../utils/utils";
import dayjs from 'dayjs';
import {
    DeleteOutlined,
    DownOutlined,
    ExclamationCircleOutlined,
    ImportOutlined,
    PlusOutlined,
    SyncOutlined,
    UndoOutlined,
    UploadOutlined
} from '@ant-design/icons';
import {PROTOCOL_COLORS} from "../../common/constants";

import {hasPermission, isAdmin} from "../../service/permission";
import Upload from "antd/es/upload";
import axios from "axios";
import {server} from "../../common/env";


const confirm = Modal.confirm;
const {Search} = Input;
const {Content} = Layout;
const {Title, Text} = Typography;

class Asset extends Component {

    inputRefOfName = React.createRef();
    inputRefOfIp = React.createRef();
    changeOwnerFormRef = React.createRef();

    state = {
        items: [],
        total: 0,
        queryParams: {
            pageIndex: 1,
            pageSize: 10,
            protocol: '',
            tags: ''
        },
        loading: false,
        modalVisible: false,
        modalTitle: '',
        modalConfirmLoading: false,
        credentials: [],
        tags: [],
        selectedTags: [],
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
        importModalVisible: false,
        fileList: [],
        uploading: false,
    };

    async componentDidMount() {

        this.loadTableData();

        let result = await request.get('/tags');
        if (result['code'] === 1) {
            this.setState({
                tags: result['data']
            })
        }
    }

    async delete(id) {
        const result = await request.delete('/assets/' + id);
        if (result['code'] === 1) {
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

    showDeleteConfirm(id, content) {
        let self = this;
        confirm({
            title: '您确定要删除此资产吗?',
            content: content,
            okText: '确定',
            okType: 'danger',
            cancelText: '取消',
            onOk() {
                self.delete(id);
            }
        });
    };

    async update(id) {
        let result = await request.get(`/assets/${id}`);
        if (result.code !== 1) {
            message.error(result.message, 10);
            return;
        }
        await this.showModal('更新资产', result.data);
    }

    async copy(id) {
        let result = await request.get(`/assets/${id}`);
        if (result.code !== 1) {
            message.error(result.message, 10);
            return;
        }
        result.data['id'] = undefined;
        await this.showModal('复制资产', result.data);
    }

    async showModal(title, asset = {}) {
        // 并行请求
        let getCredentials = request.get('/credentials');
        let getTags = request.get('/tags');

        let credentials = [];
        let tags = [];

        let r1 = await getCredentials;
        let r2 = await getTags;

        if (r1['code'] === 1) {
            credentials = r1['data'];
        }

        if (r2['code'] === 1) {
            tags = r2['data'];
        }

        if (asset['tags'] && typeof (asset['tags']) === 'string') {
            if (asset['tags'] === '' || asset['tags'] === '-') {
                asset['tags'] = [];
            } else {
                asset['tags'] = asset['tags'].split(',');
            }
        } else {
            asset['tags'] = [];
        }

        asset['use-ssl'] = asset['use-ssl'] === 'true';

        asset['ignore-cert'] = asset['ignore-cert'] === 'true';

        console.log(asset)

        this.setState({
            modalTitle: title,
            modalVisible: true,
            credentials: credentials,
            tags: tags,
            model: asset
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

        console.log(formData)
        if (formData['tags']) {
            formData.tags = formData['tags'].join(',');
        }

        if (formData.id) {
            // 向后台提交数据
            const result = await request.put('/assets/' + formData.id, formData);
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
            const result = await request.post('/assets', formData);
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

    access = async (record) => {
        const id = record['id'];
        const protocol = record['protocol'];
        const name = record['name'];

        message.loading({content: '正在检测资产是否在线...', key: id});
        let result = await request.post(`/assets/${id}/tcping`);
        if (result.code === 1) {
            if (result.data === true) {
                message.success({content: '检测完成，您访问的资产在线，即将打开窗口进行访问。', key: id, duration: 3});
                if (protocol === 'ssh') {
                    result = await request.get(`/assets/${id}/attributes`);
                    if (result.code === 1 && result['data']['ssh-mode'] === 'naive') {
                        window.open(`#/term?assetId=${id}&assetName=${name}`);
                    } else {
                        window.open(`#/access?assetId=${id}&assetName=${name}&protocol=${protocol}`);
                    }
                } else {
                    window.open(`#/access?assetId=${id}&assetName=${name}&protocol=${protocol}`);
                }
            } else {
                message.warn({content: '您访问的资产未在线，请确认网络状态。', key: id, duration: 10});
            }
        } else {
            message.error({content: result.message, key: id, duration: 10});
        }

    }

    batchDelete = async () => {
        this.setState({
            delBtnLoading: true
        })
        try {
            let result = await request.delete('/assets/' + this.state.selectedRowKeys.join(','));
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
            return {'key': item['id'], ...item}
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

    handleCancelUpdateAttr = () => {
        this.setState({
            attrVisible: false,
            selected: {},
            attributes: {}
        });
    }

    handleTableChange = (pagination, filters, sorter) => {
        let query = {
            ...this.state.queryParams,
            'order': sorter.order,
            'field': sorter.field
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
            },
            sorter: true,
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
            },
            sorter: true,
        },
            {
                title: '操作',
                key: 'action',
                render: (text, record) => {

                    const menu = (
                        <Menu>
                            <Menu.Item key="1">
                                <Button type="text" size='small'
                                        disabled={!hasPermission(record['owner'])}
                                        onClick={() => this.update(record.id)}>编辑</Button>
                            </Menu.Item>

                            <Menu.Item key="2">
                                <Button type="text" size='small'
                                        disabled={!hasPermission(record['owner'])}
                                        onClick={() => this.copy(record.id)}>复制</Button>
                            </Menu.Item>

                            {isAdmin() ?
                                <Menu.Item key="4">
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


                            <Menu.Item key="5">
                                <Button type="text" size='small'
                                        disabled={!hasPermission(record['owner'])}
                                        onClick={async () => {
                                            await this.handleShowSharer(record);
                                        }}>更新授权人</Button>
                            </Menu.Item>

                            <Menu.Divider/>
                            <Menu.Item key="6">
                                <Button type="text" size='small' danger
                                        disabled={!hasPermission(record['owner'])}
                                        onClick={() => this.showDeleteConfirm(record.id, record.name)}>删除</Button>
                            </Menu.Item>
                        </Menu>
                    );

                    return (
                        <div>
                            <Button type="link" size='small'
                                    onClick={() => this.access(record)}>接入</Button>

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
            columns.splice(6, 0, {
                title: '授权人数',
                dataIndex: 'sharerCount',
                key: 'sharerCount',
                render: (text, record, index) => {
                    return <Button type='link' onClick={async () => {
                        await this.handleShowSharer(record, true);
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
                <Content key='page-content' className="site-layout-background page-content">
                    <div style={{marginBottom: 20}}>
                        <Row justify="space-around" align="middle" gutter={24}>
                            <Col span={4} key={1}>
                                <Title level={3}>资产列表</Title>
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

                                    {isAdmin() ?
                                        <Tooltip title="批量导入">
                                            <Button type="dashed" icon={<ImportOutlined/>}
                                                    onClick={() => {
                                                        this.setState({
                                                            importModalVisible: true
                                                        })
                                                    }}>

                                            </Button>
                                        </Tooltip> : undefined
                                    }


                                    <Tooltip title="新增">
                                        <Button type="dashed" icon={<PlusOutlined/>}
                                                onClick={() => this.showModal('新增资产', {})}>

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
                           onChange={this.handleTableChange}
                    />

                    {
                        this.state.modalVisible ?
                            <AssetModal
                                visible={this.state.modalVisible}
                                title={this.state.modalTitle}
                                handleOk={this.handleOk}
                                handleCancel={this.handleCancelModal}
                                confirmLoading={this.state.modalConfirmLoading}
                                credentials={this.state.credentials}
                                tags={this.state.tags}
                                model={this.state.model}
                            />
                            : null
                    }

                    {
                        this.state.importModalVisible ?
                            <Modal title="资产导入" visible={true}
                                   onOk={() => {
                                       const formData = new FormData();
                                       formData.append("file", this.state.fileList[0]);

                                       let headers = getHeaders();
                                       headers['Content-Type'] = 'multipart/form-data';

                                       axios
                                           .post(server + "/assets/import", formData, {
                                               headers: headers
                                           })
                                           .then((resp) => {
                                               console.log("上传成功", resp);
                                               this.setState({
                                                   importModalVisible: false
                                               })
                                               let result = resp.data;
                                               if (result['code'] === 1) {
                                                   let data = result['data'];
                                                   let successCount = data['successCount'];
                                                   let errorCount = data['errorCount'];
                                                   if (errorCount === 0) {
                                                       notification['success']({
                                                           message: '导入资产成功',
                                                           description: '共导入成功' + successCount + '条资产。',
                                                       });
                                                   } else {
                                                       notification['info']({
                                                           message: '导入资产完成',
                                                           description: `共导入成功${successCount}条资产，失败${errorCount}条资产。`,
                                                       });
                                                   }
                                               } else {
                                                   notification['error']({
                                                       message: '导入资产失败',
                                                       description: result['message'],
                                                   });
                                               }
                                               this.loadTableData();
                                           });
                                   }}
                                   onCancel={() => {
                                       this.setState({
                                           importModalVisible: false
                                       })
                                   }}
                                   okButtonProps={{
                                       disabled: this.state.fileList.length === 0
                                   }}
                            >
                                <Space>
                                    <Upload
                                        maxCount={1}
                                        onRemove={file => {
                                            this.setState(state => {
                                                const index = state.fileList.indexOf(file);
                                                const newFileList = state.fileList.slice();
                                                newFileList.splice(index, 1);
                                                return {
                                                    fileList: newFileList,
                                                };
                                            });
                                        }}
                                        beforeUpload={(file) => {
                                            this.setState(state => ({
                                                fileList: [file],
                                            }));
                                            return false;
                                        }}
                                        fileList={this.state.fileList}
                                    >
                                        <Button icon={<UploadOutlined/>}>选择csv文件</Button>
                                    </Upload>

                                    <Button type="primary" onClick={() => {

                                        let csvString = 'name,ssh,127.0.0.1,22,username,password,privateKey,passphrase,description';
                                        //前置的"\uFEFF"为“零宽不换行空格”，可处理中文乱码问题
                                        const blob = new Blob(["\uFEFF" + csvString], {type: 'text/csv;charset=gb2312;'});
                                        let a = document.createElement('a');
                                        a.download = 'sample.csv';
                                        a.href = URL.createObjectURL(blob);
                                        a.click();
                                    }}>
                                        下载样本文件
                                    </Button>
                                </Space>

                            </Modal>
                            : undefined
                    }

                    <Modal title={<Text>更换资源「<strong style={{color: '#1890ff'}}>{this.state.selected['name']}</strong>」的所有者
                    </Text>}
                           visible={this.state.changeOwnerModalVisible}
                           confirmLoading={this.state.changeOwnerConfirmLoading}

                           onOk={() => {
                               this.setState({
                                   changeOwnerConfirmLoading: true
                               });

                               let changeOwnerModalVisible = false;
                               this.changeOwnerFormRef
                                   .current
                                   .validateFields()
                                   .then(async values => {
                                       let result = await request.post(`/assets/${this.state.selected['id']}/change-owner?owner=${values['owner']}`);
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
                            <Alert message="更换资产所有者不会影响授权凭证的所有者" type="info" showIcon/>

                        </Form>
                    </Modal>


                    {
                        this.state.changeSharerModalVisible ?
                            <Modal title={<Text>更新资源「<strong
                                style={{color: '#1890ff'}}>{this.state.selected['name']}</strong>」的授权人
                            </Text>}
                                   visible={this.state.changeSharerModalVisible}
                                   confirmLoading={this.state.changeSharerConfirmLoading}

                                   onOk={async () => {
                                       this.setState({
                                           changeSharerConfirmLoading: true
                                       });

                                       let changeSharerModalVisible = false;

                                       let result = await request.post(`/resource-sharers/overwrite-sharers`, {
                                           resourceId: this.state.selected['id'],
                                           resourceType: 'asset',
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

export default Asset;
