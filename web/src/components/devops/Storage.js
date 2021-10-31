import React, {Component} from 'react';
import {
    Button,
    Card,
    Col,
    Descriptions,
    Divider,
    Drawer,
    Input,
    Layout,
    List,
    Popconfirm,
    Row,
    Space,
    Tooltip,
    Typography
} from "antd";
import {
    DeleteOutlined,
    EditOutlined,
    FireOutlined,
    FolderOutlined,
    HeartOutlined,
    PlusOutlined,
    SafetyCertificateOutlined,
    SyncOutlined,
    TeamOutlined,
    UndoOutlined,
    UserOutlined
} from "@ant-design/icons";
import request from "../../common/request";
import {message} from "antd/es";
import qs from "qs";
import {cloneObj, renderSize} from "../../utils/utils";
import FileSystem from "./FileSystem";
import StorageModal from "./StorageModal";

const {Content} = Layout;
const {Title} = Typography;
const {Search} = Input;

class Storage extends Component {

    inputRefOfName = React.createRef();
    storageRef = undefined;

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
        selectedRow: undefined,
        fileSystemVisible: false,
        storageId: undefined
    };

    componentDidMount() {
        this.loadTableData();
    }

    async delete(id) {
        const result = await request.delete('/storages/' + id);
        if (result.code === 1) {
            message.success('删除成功');
            this.loadTableData(this.state.queryParams);
        } else {
            message.error(result.message, 10);
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
            let result = await request.get(`/storages/paging?${paramsStr}`);
            if (result.code === 1) {
                data = result.data;
            } else {
                message.error(result.message);
            }
        } catch (e) {

        } finally {
            this.setState({
                items: data.items,
                total: data.total,
                queryParams: queryParams,
                loading: false
            });
        }
    }

    onRef = (storageRef) => {
        this.storageRef = storageRef;
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

    showModal(title, obj = undefined) {
        this.setState({
            modalTitle: title,
            modalVisible: true,
            model: obj
        });
    };

    handleOk = async (formData) => {
        // 弹窗 form 传来的数据
        this.setState({
            modalConfirmLoading: true
        });

        if (formData.id) {
            // 转换文件大小限制单位为字节
            formData['limitSize'] = parseInt(formData['limitSize']) * 1024 * 1024;
            // 向后台提交数据
            const result = await request.put('/storages/' + formData.id, formData);
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
            // 转换文件大小限制单位为字节
            formData['limitSize'] = parseInt(formData['limitSize']) * 1024 * 1024;
            // 向后台提交数据
            const result = await request.post('/storages', formData);
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

    render() {

        return (
            <div>
                <Content className="site-layout-background page-content">
                    <div>
                        <Row justify="space-around" align="middle" gutter={24}>
                            <Col span={12} key={1}>
                                <Title level={3}>磁盘空间</Title>
                            </Col>
                            <Col span={12} key={2} style={{textAlign: 'right'}}>
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
                                            this.loadTableData({pageIndex: 1, pageSize: 10, name: '', content: ''})
                                        }}>

                                        </Button>
                                    </Tooltip>

                                    <Divider type="vertical"/>

                                    <Tooltip title="新增">
                                        <Button type="dashed" icon={<PlusOutlined/>}
                                                onClick={() => this.showModal('新增磁盘空间')}>

                                        </Button>
                                    </Tooltip>


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

                <div style={{margin: '0 16px'}}>
                    <List
                        loading={this.state.loading}
                        grid={{gutter: 16, column: 4}}
                        dataSource={this.state.items}
                        renderItem={item => {
                            let delBtn;
                            if (item['isDefault']) {
                                delBtn = <DeleteOutlined key="delete" className={'disabled-icon'}/>
                            } else {
                                delBtn = <Popconfirm
                                    title="您确认要删除此空间吗?"
                                    onConfirm={() => {
                                        this.delete(item['id']);
                                    }}
                                    okText="是"
                                    cancelText="否"
                                >
                                    <DeleteOutlined key="delete"/>
                                </Popconfirm>
                            }
                            return (
                                <List.Item>
                                    <Card title={item['name']}
                                          hoverable
                                          actions={[
                                              <FolderOutlined key='file' onClick={() => {
                                                  this.setState({
                                                      fileSystemVisible: true,
                                                      storageId: item['id']
                                                  });
                                                  if (this.storageRef) {
                                                      this.storageRef.reSetStorageId(item['id']);
                                                  }
                                              }}/>,
                                              <EditOutlined key="edit" onClick={() => {
                                                  // 转换文件大小限制单位为MB
                                                  let model = cloneObj(item);
                                                  if(model['limitSize'] > 0){
                                                      model['limitSize'] = model['limitSize'] / 1024 / 1024;
                                                  }
                                                  this.showModal('修改磁盘空间', model);
                                              }}/>,
                                              delBtn
                                              ,
                                          ]}>
                                        <Descriptions title="" column={1}>
                                            <Descriptions.Item label={<div><TeamOutlined/> 是否共享</div>}>
                                                <strong>{item['isShare'] ? '是' : '否'}</strong>
                                            </Descriptions.Item>
                                            <Descriptions.Item label={<div><SafetyCertificateOutlined/> 是否默认</div>}>
                                                <strong>{item['isDefault'] ? '是' : '否'}</strong>
                                            </Descriptions.Item>
                                            <Descriptions.Item label={<div><FireOutlined/> 大小限制</div>}>
                                                <strong>{item['limitSize'] < 0 ? '无限制' : renderSize(item['limitSize'])}</strong>
                                            </Descriptions.Item>
                                            <Descriptions.Item label={<div><HeartOutlined/> 已用大小</div>}>
                                                <strong>{renderSize(item['usedSize'])}</strong>
                                            </Descriptions.Item>
                                            <Descriptions.Item label={<div><UserOutlined/> 所属用户</div>}>
                                                <strong>{item['ownerName']}</strong>
                                            </Descriptions.Item>
                                        </Descriptions>
                                    </Card>
                                </List.Item>
                            )
                        }}
                    />
                </div>

                <Drawer
                    title={'文件管理'}
                    placement="right"
                    width={window.innerWidth * 0.8}
                    closable={true}
                    maskClosable={true}
                    onClose={() => {
                        this.setState({
                            fileSystemVisible: false
                        });
                        this.loadTableData(this.state.queryParams);
                    }}
                    visible={this.state.fileSystemVisible}
                >
                    <FileSystem
                        storageId={this.state.storageId}
                        storageType={'storages'}
                        onRef={this.onRef}
                        upload={true}
                        download={true}
                        delete={true}
                        rename={true}
                        edit={true}
                        minHeight={window.innerHeight - 103}/>
                </Drawer>

                {
                    this.state.modalVisible ?
                        <StorageModal
                            visible={this.state.modalVisible}
                            title={this.state.modalTitle}
                            handleOk={this.handleOk}
                            handleCancel={() => {
                                this.setState({
                                    modalTitle: '',
                                    modalVisible: false
                                });
                            }}
                            confirmLoading={this.state.modalConfirmLoading}
                            model={this.state.model}
                        >
                        </StorageModal> : undefined
                }
            </div>
        );
    }
}

export default Storage;