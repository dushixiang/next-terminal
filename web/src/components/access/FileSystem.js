import React, {Component} from 'react';
import {Button, Card, Form, Input, message, Modal, Row, Space, Table, Tooltip} from "antd";
import {
    CloudDownloadOutlined,
    CloudUploadOutlined,
    DeleteOutlined,
    FileExcelTwoTone,
    FileImageTwoTone,
    FileMarkdownTwoTone,
    FilePdfTwoTone,
    FileTextTwoTone,
    FileTwoTone,
    FileWordTwoTone,
    FileZipTwoTone,
    FolderAddOutlined,
    FolderTwoTone,
    LinkOutlined,
    ReloadOutlined,
    UploadOutlined
} from "@ant-design/icons";
import qs from "qs";
import request from "../../common/request";
import {server} from "../../common/constants";
import Upload from "antd/es/upload";
import {download, getToken, isEmpty, renderSize} from "../../utils/utils";
import './FileSystem.css'

const formItemLayout = {
    labelCol: {span: 6},
    wrapperCol: {span: 14},
};

class FileSystem extends Component {

    mkdirFormRef = React.createRef();

    state = {
        sessionId: undefined,
        currentDirectory: '/',
        files: [],
        loading: false,
        selectedRowKeys: [],
        selectedRow: {}
    }

    componentDidMount() {
        let sessionId = this.props.sessionId;
        this.setState({
            sessionId: sessionId
        }, () => {
            this.loadFiles(this.state.currentDirectory);
        });
    }


    handleOk = async (values) => {
        let params = {
            'dir': this.state.selectedRow.key + '/' + values['dir']
        }
        let paramStr = qs.stringify(params);

        this.setState({
            confirmLoading: true
        })
        let result = await request.post(`/sessions/${this.state.sessionId}/mkdir?${paramStr}`);
        if (result.code === 1) {
            message.success('创建成功');
            this.loadFiles(this.state.currentDirectory);
        } else {
            message.error(result.message);
        }

        this.setState({
            confirmLoading: false,
            confirmVisible: false
        })
    }

    mkdir = () => {
        this.setState({
            confirmVisible: true
        })
    }

    upload = () => {
        this.setState({
            uploadVisible: true
        })
    }

    download = () => {
        download(`${server}/sessions/${this.state.sessionId}/download?file=${this.state.selectedRow.key}`);
    }

    rmdir = async () => {
        if (!this.state.selectedRow.key) {
            message.warning('请选择一个文件或目录');
            return;
        }
        let result;
        if (this.state.selectedRow.isLeaf) {
            result = await request.delete(`/sessions/${this.state.sessionId}/rm?file=${this.state.selectedRow.key}`);
        } else {
            result = await request.delete(`/sessions/${this.state.sessionId}/rmdir?dir=${this.state.selectedRow.key}`);
        }
        if (result.code !== 1) {
            message.error(result.message);
        } else {
            message.success('删除成功');
            let path = this.state.selectedRow.key;
            let parentPath = path.substring(0, path.lastIndexOf('/'));
            let items = await this.getTreeNodes(parentPath);
            this.setState({
                treeData: this.updateTreeData(this.state.treeData, parentPath, items),
                selectedRow: {}
            });
        }
    }

    refresh = async () => {
        this.loadFiles(this.state.currentDirectory);
    }

    loadFiles = async (key) => {
        this.setState({
            loading: true
        })
        try {
            if (isEmpty(key)) {
                key = '/';
            }
            let result = await request.get(`${server}/sessions/${this.state.sessionId}/ls?dir=${key}`);
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
                selectedRow: {}
            })
        } finally {
            this.setState({
                loading: false
            })
        }

    }

    uploadChange = (info) => {
        if (info.file.status !== 'uploading') {

        }
        if (info.file.status === 'done') {
            message.success(`${info.file.name} 文件上传成功。`, 3);
        } else if (info.file.status === 'error') {
            message.error(`${info.file.name} 文件上传失败。`, 10);
        }
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
                                    icon = <FileWordTwoTone/>;
                                    break;
                                case "xls":
                                case "xlsx":
                                    icon = <FileExcelTwoTone/>;
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
                                    icon = <FileImageTwoTone/>;
                                    break;
                                case "md":
                                    icon = <FileMarkdownTwoTone/>;
                                    break;
                                case "pdf":
                                    icon = <FilePdfTwoTone/>;
                                    break;
                                case "txt":
                                    icon = <FileTextTwoTone/>;
                                    break;
                                case "zip":
                                case "gz":
                                case "tar":
                                    icon = <FileZipTwoTone/>;
                                    break;
                                default:
                                    icon = <FileTwoTone/>;
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
            }
        ];

        const title = (
            <Row>
                <Space>
                    远程文件管理
                    &nbsp;
                    &nbsp;
                    <Tooltip title="创建文件夹">
                        <Button type="primary" size="small" icon={<FolderAddOutlined/>}
                                onClick={this.mkdir} ghost/>
                    </Tooltip>

                    <Tooltip title="上传">
                        <Button type="primary" size="small" icon={<CloudUploadOutlined/>}
                                onClick={this.upload} ghost/>
                    </Tooltip>

                    <Tooltip title="下载">
                        <Button type="primary" size="small" icon={<CloudDownloadOutlined/>}
                                disabled={isEmpty(this.state.selectedRow['key']) || this.state.selectedRow['isDir'] || this.state.selectedRow['isLink']}
                                onClick={this.download} ghost/>
                    </Tooltip>

                    <Tooltip title="删除文件">
                        <Button type="dashed" size="small" icon={<DeleteOutlined/>} disabled={isEmpty(this.state.selectedRow['key'])} onClick={this.rmdir}
                                danger/>
                    </Tooltip>

                    <Tooltip title="刷新">
                        <Button type="primary" size="small" icon={<ReloadOutlined/>} onClick={this.refresh}
                                ghost/>
                    </Tooltip>
                </Space>
            </Row>
        );

        return (
            <div>
                <Card title={title} bordered={true} size="small">
                    <Table columns={columns}
                           dataSource={this.state.files}
                           size={'small'}
                           pagination={false}
                           loading={this.state.loading}
                           onRow={record => {
                               return {
                                   onClick: event => {
                                       this.setState({
                                           selectedRow: record
                                       });
                                   }, // 点击行
                                   onDoubleClick: event => {
                                       if (record['isDir'] || record['isLink']) {
                                           if (record['path'] === '..') {
                                               // 获取当前目录的上级目录
                                               let currentDirectory = this.state.currentDirectory;
                                               console.log(currentDirectory)
                                               let parentDirectory = currentDirectory.substring(0, currentDirectory.lastIndexOf('/'));
                                               this.loadFiles(parentDirectory);
                                           } else {
                                               this.loadFiles(record['path']);
                                           }
                                       } else {

                                       }
                                   },
                                   onContextMenu: event => {

                                   },
                                   onMouseEnter: event => {

                                   }, // 鼠标移入行
                                   onMouseLeave: event => {
                                   },
                               };
                           }}

                           rowClassName={(record) => {
                               return record['key'] === this.state.selectedRow['key'] ? 'selectedRow' : '';
                           }}
                    />
                </Card>

                <Modal
                    title="上传文件"
                    visible={this.state.uploadVisible}
                    onOk={() => {

                    }}
                    confirmLoading={this.state.uploadLoading}
                    onCancel={()=>{
                        this.setState({
                            uploadVisible: false
                        })
                    }}
                >
                    <Upload
                        action={server + '/sessions/' + this.state.sessionId + '/upload?X-Auth-Token=' + getToken() + '&dir=' + this.state.selectedRow.key}>
                        <Button icon={<UploadOutlined/>}>上传文件</Button>
                    </Upload>
                </Modal>


                <Modal
                    title="创建文件夹"
                    visible={this.state.confirmVisible}
                    onOk={() => {
                        this.formRef.current
                            .validateFields()
                            .then(values => {
                                this.formRef.current.resetFields();
                                this.handleOk(values);
                            })
                            .catch(info => {

                            });
                    }}
                    confirmLoading={this.state.confirmLoading}
                    onCancel={()=>{
                        this.setState({
                            confirmVisible: false
                        })
                    }}
                >
                    <Form ref={this.formRef} {...formItemLayout}>

                        <Form.Item label="文件夹名称" name='dir' rules={[{required: true, message: '请输入文件夹名称'}]}>
                            <Input autoComplete="off" placeholder="请输入文件夹名称"/>
                        </Form.Item>
                    </Form>
                </Modal>


            </div>
        );
    }
}

export default FileSystem;