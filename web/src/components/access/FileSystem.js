import React, {Component} from 'react';
import {Button, Card, Form, Input, message, Modal, Row, Space, Table, Tooltip, Tree} from "antd";
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
    LoadingOutlined,
    ReloadOutlined,
    UploadOutlined
} from "@ant-design/icons";
import qs from "qs";
import request from "../../common/request";
import {server} from "../../common/constants";
import Upload from "antd/es/upload";
import {download, getToken, renderSize} from "../../utils/utils";

const antIcon = <LoadingOutlined/>;

const formItemLayout = {
    labelCol: {span: 6},
    wrapperCol: {span: 14},
};

const {DirectoryTree} = Tree;

class FileSystem extends Component {

    state = {
        sessionId: undefined,
        currentDirectory: '/',
        files: [],
        loading: false,
        selectNode: {},
        selectedRowKeys: []
    }

    componentDidMount() {
        let sessionId = this.props.sessionId;
        this.setState({
            sessionId: sessionId
        }, () => {
            this.loadFiles('/');
        });
    }

    onSelect = (keys, event) => {
        this.setState({
            selectNode: {
                key: keys[0],
                isLeaf: event.node.isLeaf
            }
        })
    };

    handleOk = async (values) => {
        let params = {
            'dir': this.state.selectNode.key + '/' + values['dir']
        }
        let paramStr = qs.stringify(params);

        this.setState({
            confirmLoading: true
        })
        let result = await request.post(`/sessions/${this.state.sessionId}/mkdir?${paramStr}`);
        if (result.code === 1) {
            message.success('创建成功');
            let parentPath = this.state.selectNode.key;
            let items = await this.getTreeNodes(parentPath);
            this.setState({
                treeData: this.updateTreeData(this.state.treeData, parentPath, items),
                selectNode: {}
            });
        } else {
            message.error(result.message);
        }

        this.setState({
            confirmLoading: false,
            confirmVisible: false
        })
    }

    handleConfirmCancel = () => {
        this.setState({
            confirmVisible: false
        })
    }

    handleUploadCancel = () => {
        this.setState({
            uploadVisible: false
        })
    }

    mkdir = () => {
        if (!this.state.selectNode.key || this.state.selectNode.isLeaf) {
            message.warning('请选择一个目录');
            return;
        }
        this.setState({
            confirmVisible: true
        })
    }

    upload = () => {
        if (!this.state.selectNode.key || this.state.selectNode.isLeaf) {
            message.warning('请选择一个目录进行上传');
            return;
        }
        this.setState({
            uploadVisible: true
        })
    }

    download = () => {
        if (!this.state.selectNode.key || !this.state.selectNode.isLeaf) {
            message.warning('当前只支持下载文件');
            return;
        }
        download(`${server}/sessions/${this.state.sessionId}/download?file=${this.state.selectNode.key}`);
    }

    rmdir = async () => {
        if (!this.state.selectNode.key) {
            message.warning('请选择一个文件或目录');
            return;
        }
        let result;
        if (this.state.selectNode.isLeaf) {
            result = await request.delete(`/sessions/${this.state.sessionId}/rm?file=${this.state.selectNode.key}`);
        } else {
            result = await request.delete(`/sessions/${this.state.sessionId}/rmdir?dir=${this.state.selectNode.key}`);
        }
        if (result.code !== 1) {
            message.error(result.message);
        } else {
            message.success('删除成功');
            let path = this.state.selectNode.key;
            let parentPath = path.substring(0, path.lastIndexOf('/'));
            let items = await this.getTreeNodes(parentPath);
            this.setState({
                treeData: this.updateTreeData(this.state.treeData, parentPath, items),
                selectNode: {}
            });
        }
    }

    refresh = async () => {
        if (!this.state.selectNode.key || this.state.selectNode.isLeaf) {
            await this.loadDirData('/');
        } else {
            let key = this.state.selectNode.key;
            let items = await this.getTreeNodes(key);
            this.setState({
                treeData: this.updateTreeData(this.state.treeData, key, items),
            });
        }
        message.success('刷新目录成功');
    }

    loadFiles = async (key) => {
        this.setState({
            loading: true
        })
        try {
            let result = await request.get(`${server}/sessions/${this.state.sessionId}/ls?dir=${key}`);
            if (result['code'] !== 1) {
                message.error(result['message']);
                return;
            }

            let data = result['data'];

            const items = data.map(item => {
                return {'key': item['path'], ...item}
            })

            this.setState({
                files: items
            })
        } finally {
            this.setState({
                loading: false
            })
        }

    }

    loadDirData = async (key) => {
        let items = await this.getTreeNodes(key);
        this.setState({
            treeData: items,
        });
    }

    getTreeNodes = async (key) => {
        const url = server + '/sessions/' + this.state.sessionId + '/ls?dir=' + key;

        let result = await request.get(url);

        if (result.code !== 1) {
            message.error(result['message']);
            return [];
        }

        let data = result.data;

        return data.map(item => {
            return {
                title: item['name'],
                key: item['path'],
                isLeaf: !item['isDir'] && !item['isLink'],
            }
        });
    }


    onLoadData = ({key, children}) => {

        return new Promise(async (resolve) => {
            if (children) {
                resolve();
                return;
            }

            let items = await this.getTreeNodes(key);
            this.setState({
                treeData: this.updateTreeData(this.state.treeData, key, items),
            });

            resolve();
        });
    }

    updateTreeData = (list, key, children) => {
        return list.map((node) => {
            if (node.key === key) {
                return {...node, children};
            } else if (node.children) {
                return {...node, children: this.updateTreeData(node.children, key, children)};
            }

            return node;
        });
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

                    return <>{icon}&nbsp;&nbsp;{item['name']}</>;
                },
                sorter: (a, b) => a.name - b.name,
                sortDirections: ['descend', 'ascend'],
            },
            {
                title: '大小',
                dataIndex: 'size',
                key: 'size',
                render: (value, item) => {
                    if (!item['isDir'] && !item['isLink']) {
                        return renderSize(value)
                    }
                    return '-';
                },
                sorter: (a, b) => a.size - b.size,
            },
            {
                title: '修改日期',
                dataIndex: 'modTime',
                key: 'modTime',
                sorter: (a, b) => a.modTime - b.modTime,
                sortDirections: ['descend', 'ascend'],
            }
        ];

        const {loading, selectedRowKeys} = this.state;
        const rowSelection = {
            selectedRowKeys,
            onChange: () => {

            },
        };
        const hasSelected = selectedRowKeys.length > 0;

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
                                onClick={this.download} ghost/>
                    </Tooltip>

                    <Tooltip title="删除文件">
                        <Button type="dashed" size="small" icon={<DeleteOutlined/>} onClick={this.rmdir}
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
                           rowSelection={rowSelection}
                           dataSource={this.state.files}
                           size={'small'}
                           pagination={false}
                           loading={this.state.loading}
                           onRow={record => {
                               return {
                                   onClick: event => {

                                   }, // 点击行
                                   onDoubleClick: event => {
                                       this.loadFiles(record['path']);
                                   },
                                   onContextMenu: event => {
                                   },
                                   onMouseEnter: event => {
                                   }, // 鼠标移入行
                                   onMouseLeave: event => {
                                   },
                               };
                           }}
                    />
                </Card>

                <Modal
                    title="上传文件"
                    visible={this.state.uploadVisible}
                    onOk={() => {

                    }}
                    confirmLoading={this.state.uploadLoading}
                    onCancel={this.handleUploadCancel}
                >
                    <Upload
                        action={server + '/sessions/' + this.state.sessionId + '/upload?X-Auth-Token=' + getToken() + '&dir=' + this.state.selectNode.key}>
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
                    onCancel={this.handleConfirmCancel}
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