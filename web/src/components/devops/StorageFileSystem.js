import React, {Component} from 'react';
import {
    Button,
    Card,
    Form,
    Input,
    message,
    Modal,
    notification, Popconfirm,
    Progress,
    Space,
    Table,
    Tooltip,
    Typography
} from "antd";
import {
    CloudUploadOutlined,
    FileExcelOutlined,
    FileImageOutlined,
    FileMarkdownOutlined,
    FileOutlined,
    FilePdfOutlined,
    FileTextOutlined,
    FileWordOutlined,
    FileZipOutlined,
    FolderAddOutlined,
    FolderTwoTone,
    LinkOutlined,
    ReloadOutlined
} from "@ant-design/icons";
import qs from "qs";
import request from "../../common/request";
import {server} from "../../common/env";
import {download, getFileName, getToken, isEmpty, renderSize} from "../../utils/utils";
import './StorageFileSystem.css'

const {Text} = Typography;

class StorageFileSystem extends Component {

    mkdirFormRef = React.createRef();
    renameFormRef = React.createRef();

    state = {
        storageId: undefined,
        currentDirectory: '/',
        currentDirectoryInput: '/',
        files: [],
        loading: false,
        currentFileKey: undefined,
        selectedRowKeys: [],
        uploading: {},
        callback: undefined
    }

    componentDidMount() {
        if (this.props.onRef) {
            this.props.onRef(this);
        }
        this.setState({
            storageId: this.props.storageId,
            callback: this.props.callback
        }, () => {
            this.loadFiles(this.state.currentDirectory);
        });
    }

    reSetStorageId = (storageId) => {
        this.setState({
            storageId: storageId
        }, () => {
            this.loadFiles('/');
        });
    }

    refresh = async () => {
        this.loadFiles(this.state.currentDirectory);
        if(this.state.callback){
            this.state.callback();
        }
    }

    loadFiles = async (key) => {
        this.setState({
            loading: true
        })
        try {
            if (isEmpty(key)) {
                key = '/';
            }
            let result = await request.get(`/storages/${this.state.storageId}/ls?dir=${key}`);
            if (result['code'] !== 1) {
                message.error(result['message']);
                return;
            }

            let data = result['data'];

            const items = data.map(item => {
                return {'key': item['path'], ...item}
            });

            if (key !== '/') {
                items.splice(0, 0, {key: '..', name: '..', path: '..', isDir: true})
            }

            this.setState({
                files: items,
                currentDirectory: key,
                currentDirectoryInput: key
            })
        } finally {
            this.setState({
                loading: false
            })
        }

    }

    handleCurrentDirectoryInputChange = (event) => {
        this.setState({
            currentDirectoryInput: event.target.value
        })
    }

    handleCurrentDirectoryInputPressEnter = (event) => {
        this.loadFiles(event.target.value);
    }

    handleUploadFile = () => {
        const file = window.document.getElementById('file-upload').files[0];
        const {name, size} = file;
        let url = server + '/storages/' + this.state.storageId + '/upload?X-Auth-Token=' + getToken() + '&dir=' + this.state.currentDirectory;

        const key = name;
        const xhr = new XMLHttpRequest();
        let prevPercent = 0, percent = 0;

        const uploadEnd = (success, message) => {
            if (success) {
                let description = (
                    <React.Fragment>
                        <div>{name}</div>
                        <div>{renderSize(size)}/{renderSize(size)}</div>
                        <Progress percent={100}/>
                    </React.Fragment>
                );
                notification.success({
                    key,
                    message: `上传成功`,
                    duration: 5,
                    description: description,
                    placement: 'bottomRight'
                });
                this.refresh();
            } else {
                let description = (
                    <React.Fragment>
                        <div>{name}</div>
                        <div>-/{renderSize(size)}</div>
                        <Text type="danger">{message}</Text>
                    </React.Fragment>
                );
                notification.error({
                    key,
                    message: `上传失败`,
                    duration: 10,
                    description: description,
                    placement: 'bottomRight'
                });
            }
        }

        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                let description = (
                    <React.Fragment>
                        <div>{name}</div>
                        <div>{renderSize(event.loaded)}/{renderSize(size)}</div>
                        <Progress percent={99}/>
                    </React.Fragment>
                );
                if (event.loaded === event.total) {
                    notification.info({
                        key,
                        message: `向目标机器传输中...`,
                        duration: null,
                        description: description,
                        placement: 'bottomRight',
                        onClose: () => {
                            xhr.abort();
                            message.info(`您已取消上传"${name}"`, 10);
                        }
                    });
                    return;
                }
                percent = Math.min(Math.floor(event.loaded * 100 / event.total), 99);
                if (prevPercent === percent) {
                    return;
                }
                description = (
                    <React.Fragment>
                        <div>{name}</div>
                        <div>{renderSize(event.loaded)}/{renderSize(size)}</div>
                        <Progress percent={percent}/>
                    </React.Fragment>
                );

                notification.info({
                    key,
                    message: `上传中...`,
                    duration: null,
                    description: description,
                    placement: 'bottomRight',
                    onClose: () => {
                        xhr.abort();
                        message.info(`您已取消上传"${name}"`, 10);
                    }
                });
                prevPercent = percent;
            }

        }, false)
        xhr.onreadystatechange = (data) => {
            if (xhr.readyState !== 4) {
                return;
            }
            if (xhr.status >= 200 && xhr.status < 300) {
                const responseText = data.currentTarget.responseText
                let result;
                try {
                    result = JSON.parse(responseText)
                } catch (e) {
                    result = {}
                }
                if (result.code !== 1) {
                    uploadEnd(false, result['message']);
                } else {
                    uploadEnd(true, result['message']);
                }
            } else if (xhr.status >= 400 && xhr.status < 500) {
                uploadEnd(false, '服务器内部错误');
            }
        }

        xhr.onerror = () => {
            uploadEnd(false, '服务器内部错误');
        }
        xhr.open('POST', url, true);
        let formData = new FormData();
        formData.append("file", file, name);
        xhr.send(formData);
    }

    render() {

        const columns = [
            {
                title: '名称',
                dataIndex: 'name',
                key: 'name',
                render: (value, item) => {
                    let icon;
                    if (item['isDir']) {
                        icon = <FolderTwoTone/>;
                    } else {
                        if (item['isLink']) {
                            icon = <LinkOutlined/>;
                        } else {
                            const fileExtension = item['name'].split('.').pop().toLowerCase();
                            switch (fileExtension) {
                                case "doc":
                                case "docx":
                                    icon = <FileWordOutlined/>;
                                    break;
                                case "xls":
                                case "xlsx":
                                    icon = <FileExcelOutlined/>;
                                    break;
                                case "bmp":
                                case "jpg":
                                case "jpeg":
                                case "png":
                                case "tif":
                                case "gif":
                                case "pcx":
                                case "tga":
                                case "exif":
                                case "svg":
                                case "psd":
                                case "ai":
                                case "webp":
                                    icon = <FileImageOutlined/>;
                                    break;
                                case "md":
                                    icon = <FileMarkdownOutlined/>;
                                    break;
                                case "pdf":
                                    icon = <FilePdfOutlined/>;
                                    break;
                                case "txt":
                                    icon = <FileTextOutlined/>;
                                    break;
                                case "zip":
                                case "gz":
                                case "tar":
                                case "tgz":
                                    icon = <FileZipOutlined/>;
                                    break;
                                default:
                                    icon = <FileOutlined/>;
                                    break;
                            }
                        }
                    }

                    return <span className={'dode'}>{icon}&nbsp;&nbsp;{item['name']}</span>;
                },
                sorter: (a, b) => {
                    if (a['key'] === '..') {
                        return 0;
                    }

                    if (b['key'] === '..') {
                        return 0;
                    }
                    return a.name.localeCompare(b.name);
                },
                sortDirections: ['descend', 'ascend'],
            },
            {
                title: '大小',
                dataIndex: 'size',
                key: 'size',
                render: (value, item) => {
                    if (!item['isDir'] && !item['isLink']) {
                        return <span className={'dode'}>{renderSize(value)}</span>;
                    }
                    return <span className={'dode'}/>;
                },
                sorter: (a, b) => {
                    if (a['key'] === '..') {
                        return 0;
                    }

                    if (b['key'] === '..') {
                        return 0;
                    }
                    return a.size - b.size;
                },
            }, {
                title: '修改日期',
                dataIndex: 'modTime',
                key: 'modTime',
                sorter: (a, b) => {
                    if (a['key'] === '..') {
                        return 0;
                    }

                    if (b['key'] === '..') {
                        return 0;
                    }
                    return a.modTime.localeCompare(b.modTime);
                },
                sortDirections: ['descend', 'ascend'],
                render: (value, item) => {
                    return <span className={'dode'}>{value}</span>;
                },
            }, {
                title: '属性',
                dataIndex: 'mode',
                key: 'mode',
                render: (value, item) => {
                    return <span className={'dode'}>{value}</span>;
                },
            }, {
                title: '操作',
                dataIndex: 'action',
                key: 'action',
                width: 200,
                render: (value, item) => {
                    if(item['key'] === '..'){
                        return undefined;
                    }
                    let disableDownload = false;
                    if (item['isDir'] || item['isLink']) {
                        disableDownload = true;
                    }
                    return (
                        <>
                            <Button type="link" size='small' disabled={disableDownload} onClick={async ()=>{
                                download(`${server}/storages/${this.state.storageId}/download?file=${item['key']}&X-Auth-Token=${getToken()}'`);
                            }}>下载</Button>
                            <Button type={'link'} size={'small'} onClick={() => {
                                this.setState({
                                    renameVisible: true,
                                    currentFileKey: item['key']
                                })
                            }}>重命名</Button>
                            <Popconfirm
                                title="您确认要删除此文件吗?"
                                onConfirm={async () => {
                                    let result = await request.post(`/storages/${this.state.storageId}/rm?key=${item['key']}`);
                                    if (result['code'] !== 1) {
                                        message.error(result['message']);
                                        return;
                                    }
                                    this.refresh();
                                }}
                                okText="是"
                                cancelText="否"
                            >
                                <Button type={'link'} size={'small'} danger>删除</Button>
                            </Popconfirm>
                        </>
                    );
                },
            }
        ];

        const title = (
            <div className='fs-header'>
                <div className='fs-header-left'>
                    <Input value={this.state.currentDirectoryInput} onChange={this.handleCurrentDirectoryInputChange}
                           onPressEnter={this.handleCurrentDirectoryInputPressEnter}/>
                </div>
                <div className='fs-header-right'>
                    <Space>
                        <div className='fs-header-right-item'>
                            <Tooltip title="创建文件夹">
                                <Button type="primary" size="small" icon={<FolderAddOutlined/>}
                                        onClick={() => {
                                            this.setState({
                                                mkdirVisible: true
                                            })
                                        }} ghost/>
                            </Tooltip>
                        </div>

                        <div className='fs-header-right-item'>
                            <Tooltip title="上传">
                                <Button type="primary" size="small" icon={<CloudUploadOutlined/>}
                                        onClick={() => {
                                            window.document.getElementById('file-upload').click();
                                        }} ghost/>
                                <input type="file" id="file-upload" style={{display: 'none'}}
                                       onChange={this.handleUploadFile}/>
                            </Tooltip>
                        </div>
                        <div className='fs-header-right-item'>
                            <Tooltip title="刷新">
                                <Button type="primary" size="small" icon={<ReloadOutlined/>} onClick={this.refresh}
                                        ghost/>
                            </Tooltip>
                        </div>
                    </Space>
                </div>
            </div>
        );

        const {selectedRowKeys} = this.state;
        const rowSelection = {
            selectedRowKeys,
            onChange: (selectedRowKeys) => {
                this.setState({selectedRowKeys});
            },
        };

        return (
            <div>
                <Card title={title} bordered={true} size="small" style={{minHeight: window.innerHeight - 103}}>

                    <Table columns={columns}
                           rowSelection={rowSelection}
                           dataSource={this.state.files}
                           size={'small'}
                           pagination={false}
                           loading={this.state.loading}

                           onRow={record => {
                               return {
                                   onDoubleClick: event => {
                                       if (record['isDir'] || record['isLink']) {
                                           if (record['path'] === '..') {
                                               // 获取当前目录的上级目录
                                               let currentDirectory = this.state.currentDirectory;
                                               let parentDirectory = currentDirectory.substring(0, currentDirectory.lastIndexOf('/'));
                                               this.loadFiles(parentDirectory);
                                           } else {
                                               this.loadFiles(record['path']);
                                           }
                                       } else {

                                       }
                                   },
                               };
                           }}
                    />
                </Card>

                {
                    this.state.mkdirVisible ?
                        <Modal
                            title="创建文件夹"
                            visible={this.state.mkdirVisible}

                            onOk={() => {
                                this.mkdirFormRef.current
                                    .validateFields()
                                    .then(async values => {
                                        this.mkdirFormRef.current.resetFields();
                                        let params = {
                                            'dir': this.state.currentDirectory + '/' + values['dir']
                                        }
                                        let paramStr = qs.stringify(params);

                                        this.setState({
                                            confirmLoading: true
                                        })
                                        let result = await request.post(`/storages/${this.state.storageId}/mkdir?${paramStr}`);
                                        if (result.code === 1) {
                                            message.success('创建成功');
                                            this.loadFiles(this.state.currentDirectory);
                                        } else {
                                            message.error(result.message);
                                        }

                                        this.setState({
                                            confirmLoading: false,
                                            mkdirVisible: false
                                        })
                                    })
                                    .catch(info => {

                                    });
                            }}
                            confirmLoading={this.state.confirmLoading}
                            onCancel={() => {
                                this.setState({
                                    mkdirVisible: false
                                })
                            }}
                        >
                            <Form ref={this.mkdirFormRef}>

                                <Form.Item name='dir' rules={[{required: true, message: '请输入文件夹名称'}]}>
                                    <Input autoComplete="off" placeholder="请输入文件夹名称"/>
                                </Form.Item>
                            </Form>
                        </Modal> : undefined
                }

                {
                    this.state.renameVisible ?
                        <Modal
                            title="重命名"
                            visible={this.state.renameVisible}
                            okButtonProps={{form:'rename-form', key: 'submit', htmlType: 'submit'}}
                            onOk={() => {
                                this.renameFormRef.current
                                    .validateFields()
                                    .then(async values => {
                                        this.renameFormRef.current.resetFields();

                                        try {
                                            let currentDirectory = this.state.currentDirectory;
                                            if (!currentDirectory.endsWith("/")) {
                                                currentDirectory += '/';
                                            }
                                            let params = {
                                                'oldName': this.state.currentFileKey,
                                                'newName': currentDirectory + values['newName'],
                                            }

                                            if (params['oldName'] === params['newName']) {
                                                message.success('重命名成功');
                                                return;
                                            }

                                            let paramStr = qs.stringify(params);

                                            this.setState({
                                                confirmLoading: true
                                            })
                                            let result = await request.post(`/storages/${this.state.storageId}/rename?${paramStr}`);
                                            if (result['code'] === 1) {
                                                message.success('重命名成功');
                                                this.refresh();
                                            } else {
                                                message.error(result.message);
                                            }
                                        } finally {
                                            this.setState({
                                                confirmLoading: false,
                                                renameVisible: false
                                            })
                                        }
                                    })
                                    .catch(info => {

                                    });
                            }}
                            confirmLoading={this.state.confirmLoading}
                            onCancel={() => {
                                this.setState({
                                    renameVisible: false
                                })
                            }}
                        >
                            <Form id={'rename-form'}
                                  ref={this.renameFormRef}
                                  initialValues={{newName: getFileName(this.state.currentFileKey)}}>
                                <Form.Item name='newName' rules={[{required: true, message: '请输入新的名称'}]}>
                                    <Input autoComplete="off" placeholder="新的名称"/>
                                </Form.Item>
                            </Form>
                        </Modal> : undefined
                }
            </div>
        );
    }
}

export default StorageFileSystem;