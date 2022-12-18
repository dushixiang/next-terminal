import React, {useState} from 'react';

import {
    Badge,
    Button,
    Layout,
    Modal,
    notification,
    Popconfirm,
    Popover,
    Select,
    Table,
    Tag,
    Tooltip,
    Upload
} from "antd";
import {Link, useNavigate} from "react-router-dom";
import {ProTable, TableDropdown} from "@ant-design/pro-components";
import assetApi from "../../api/asset";
import tagApi from "../../api/tag";
import {PROTOCOL_COLORS} from "../../common/constants";
import strings from "../../utils/strings";
import AssetModal from "./AssetModal";
import ColumnState, {useColumnState} from "../../hook/column-state";
import {useQuery} from "react-query";
import Show from "../../dd/fi/show";
import {hasMenu} from "../../service/permission";
import ChangeOwner from "./ChangeOwner";
import dayjs from "dayjs";

const api = assetApi;
const {Content} = Layout;

const actionRef = React.createRef();

function downloadImportExampleCsv() {
    let csvString = 'name,ssh,127.0.0.1,22,username,password,privateKey,passphrase,description,tag1|tag2|tag3';
    //前置的"\uFEFF"为“零宽不换行空格”，可处理中文乱码问题
    const blob = new Blob(["\uFEFF" + csvString], {type: 'text/csv;charset=gb2312;'});
    let a = document.createElement('a');
    a.download = 'sample.csv';
    a.href = URL.createObjectURL(blob);
    a.click();
}

const importExampleContent = <>
    <a onClick={downloadImportExampleCsv}>下载示例</a>
    <div>导入资产时，账号、密码和密钥、密码属于二选一，都填写时优先选择私钥和密码。</div>
</>

const Asset = () => {
    let [visible, setVisible] = useState(false);
    let [confirmLoading, setConfirmLoading] = useState(false);
    let [selectedRowKey, setSelectedRowKey] = useState(undefined);
    let [items, setItems] = useState([]);
    let [selectedRowKeys, setSelectedRowKeys] = useState([]);
    let [copied, setCopied] = useState(false);

    let [selectedRow, setSelectedRow] = useState(undefined);
    let [changeOwnerVisible, setChangeOwnerVisible] = useState(false);

    const [columnsStateMap, setColumnsStateMap] = useColumnState(ColumnState.ASSET);

    const tagQuery = useQuery('getAllTag', tagApi.getAll);
    let navigate = useNavigate();

    const columns = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: '名称',
            dataIndex: 'name',
            sorter: true,
            render: (text, record) => {
                if (record['description'] === '-') {
                    record['description'] = '';
                }

                let view = <div>{text}</div>;
                if (hasMenu('asset-detail')) {
                    view = <Link to={`/asset/${record['id']}`}>{text}</Link>;
                }
                return <div>
                    {view}
                    <div style={{
                        color: 'rgba(0, 0, 0, 0.45)',
                        lineHeight: 1.45,
                        fontSize: '14px'
                    }}>{record['description']}</div>
                </div>
            },
        }, {
            title: '协议',
            dataIndex: 'protocol',
            key: 'protocol',
            sorter: true,
            render: (text, record) => {
                return (
                    <Tag color={PROTOCOL_COLORS[text]}>{text}</Tag>
                )
            },
            renderFormItem: (item, {type, defaultRender, ...rest}, form) => {
                if (type === 'form') {
                    return null;
                }

                return (
                    <Select>
                        <Select.Option value="rdp">RDP</Select.Option>
                        <Select.Option value="ssh">SSH</Select.Option>
                        <Select.Option value="telnet">Telnet</Select.Option>
                        <Select.Option value="kubernetes">Kubernetes</Select.Option>
                    </Select>
                );
            },
        }, {
            title: '网络',
            dataIndex: 'network',
            key: 'network',
            sorter: true,
            fieldProps: {
                placeholder: '示例: 127、127.0.0.1、:22、127.0.0.1:22'
            },
            render: (text, record) => {
                return `${record['ip'] + ':' + record['port']}`;
            }
        }, {
            title: '标签',
            dataIndex: 'tags',
            key: 'tags',
            render: tags => {
                if (strings.hasText(tags)) {
                    return tags.split(',').filter(tag => tag !== '-').map(tag => <Tag key={tag}>{tag}</Tag>);
                }
            },
            renderFormItem: (item, {type, defaultRender, ...rest}, form) => {
                if (type === 'form') {
                    return null;
                }

                return (
                    <Select mode="multiple"
                            allowClear>
                        {
                            tagQuery.data?.map(tag => {
                                if (tag === '-') {
                                    return undefined;
                                }
                                return <Select.Option key={tag}>{tag}</Select.Option>
                            })
                        }
                    </Select>
                );
            },
        }, {
            title: '状态',
            dataIndex: 'active',
            key: 'active',
            sorter: true,
            render: (text, record) => {
                if (record['testing'] === true) {
                    return (
                        <Tooltip title='测试中'>
                            <Badge status="processing" text='测试中'/>
                        </Tooltip>
                    )
                }
                if (text) {
                    return (
                        <Tooltip title='运行中'>
                            <Badge status="success" text='运行中'/>
                        </Tooltip>
                    )
                } else {
                    return (
                        <Tooltip title={record['activeMessage']}>
                            <Badge status="error" text='不可用'/>
                        </Tooltip>
                    )
                }
            },
            renderFormItem: (item, {type, defaultRender, ...rest}, form) => {
                if (type === 'form') {
                    return null;
                }

                return (
                    <Select>
                        <Select.Option value="true">运行中</Select.Option>
                        <Select.Option value="false">不可用</Select.Option>
                    </Select>
                );
            },
        }, {
            title: '所有者',
            dataIndex: 'ownerName',
            key: 'ownerName',
            hideInSearch: true,
        },
        {
            title: '创建时间',
            key: 'created',
            sorter: true,
            dataIndex: 'created',
            hideInSearch: true,
        },
        {
            title: '最后接入时间',
            key: 'lastAccessTime',
            sorter: true,
            dataIndex: 'lastAccessTime',
            hideInSearch: true,
            render: (text, record) => {
                if (text === '0001-01-01 00:00:00') {
                    return '-';
                }
                return (
                    <Tooltip title={text}>
                        {dayjs(text).fromNow()}
                    </Tooltip>
                )
            },
        },
        {
            title: '操作',
            valueType: 'option',
            key: 'option',
            render: (text, record, index, action) => {
                const id = record['id'];
                const protocol = record['protocol'];
                const name = record['name'];
                let url = '';
                if (protocol === 'ssh') {
                    url = `#/term?assetId=${id}&assetName=${name}`;
                } else {
                    url = `#/access?assetId=${id}&assetName=${name}&protocol=${protocol}`;
                }

                return [
                    <Show menu={'asset-access'} key={'asset-access'}>
                        <a
                            key="access"
                            href={url}
                            target='_blank'
                        >
                            接入
                        </a>
                    </Show>,
                    <Show menu={'asset-edit'} key={'asset-edit'}>
                        <a
                            key="edit"
                            onClick={() => {
                                setVisible(true);
                                setSelectedRowKey(record['id']);
                            }}
                        >
                            编辑
                        </a>
                    </Show>,
                    <Show menu={'asset-del'} key={'asset-del'}>
                        <Popconfirm
                            key={'confirm-delete'}
                            title="您确认要删除此行吗?"
                            onConfirm={async () => {
                                await api.deleteById(record.id);
                                actionRef.current.reload();
                            }}
                            okText="确认"
                            cancelText="取消"
                        >
                            <a key='delete' className='danger'>删除</a>
                        </Popconfirm>
                    </Show>,
                    <TableDropdown
                        key="actionGroup"
                        onSelect={(key) => {
                            switch (key) {
                                case "copy":
                                    setCopied(true);
                                    setVisible(true);
                                    setSelectedRowKey(record['id']);
                                    break;
                                case "test":
                                    connTest(record['id'], index);
                                    break;
                                case "change-owner":
                                    handleChangeOwner(record);
                                    break;
                                case 'asset-detail':
                                    navigate(`/asset/${record['id']}?activeKey=info`);
                                    break;
                                case 'asset-authorised-user':
                                    navigate(`/asset/${record['id']}?activeKey=bind-user`);
                                    break;
                                case 'asset-authorised-user-group':
                                    navigate(`/asset/${record['id']}?activeKey=bind-user-group`);
                                    break;
                            }
                        }}
                        menus={[
                            {key: 'copy', name: '复制', disabled: !hasMenu('asset-copy')},
                            {key: 'test', name: '连通性测试', disabled: !hasMenu('asset-conn-test')},
                            {key: 'change-owner', name: '更换所有者', disabled: !hasMenu('asset-change-owner')},
                            {key: 'asset-detail', name: '详情', disabled: !hasMenu('asset-detail')},
                            {
                                key: 'asset-authorised-user',
                                name: '授权用户',
                                disabled: !hasMenu('asset-authorised-user')
                            },
                            {
                                key: 'asset-authorised-user-group',
                                name: '授权用户组',
                                disabled: !hasMenu('asset-authorised-user-group')
                            },
                        ]}
                    />,
                ]
            },
        },
    ];

    const connTest = async (id, index) => {
        items[index]['testing'] = true;
        setItems(items.slice());
        let [active, msg] = await assetApi.connTest(id);
        items[index]['active'] = active;
        items[index]['activeMessage'] = msg;
        items[index]['testing'] = false;
        setItems(items.slice());
    }

    const connTestInBatch = async () => {
        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            if (selectedRowKeys.includes(item['id'])) {
                connTest(item['id'], i);
            }
        }
        setSelectedRowKeys([]);
    }

    const handleImportAsset = async (file) => {

        let [success, data] = await api.importAsset(file);
        if (success === false) {
            notification['error']({
                message: '导入资产失败',
                description: data,
            });
            return false;
        }

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
        actionRef.current.reload();
        return false;
    }

    const handleChangeOwner = (row) => {
        setSelectedRow(row);
        setChangeOwnerVisible(true);
    }

    return (<Content className="page-container">
        <ProTable
            columns={columns}
            actionRef={actionRef}
            columnsState={{
                value: columnsStateMap,
                onChange: setColumnsStateMap
            }}
            request={async (params = {}, sort, filter) => {

                let field = '';
                let order = '';
                if (Object.keys(sort).length > 0) {
                    field = Object.keys(sort)[0];
                    if (field === 'network') {
                        field = 'ip';
                    }
                    order = Object.values(sort)[0];
                }

                let ip, port;
                if (params.network) {
                    let split = params.network.split(':');
                    if (split.length >= 2) {
                        ip = split[0];
                        port = split[1];
                    } else {
                        ip = split[0];
                    }
                }

                let queryParams = {
                    pageIndex: params.current,
                    pageSize: params.pageSize,
                    name: params.name,
                    type: params.type,
                    protocol: params.protocol,
                    active: params.active,
                    'tags': params.tags?.join(','),
                    ip: ip,
                    port: port,
                    field: field,
                    order: order
                }
                let result = await api.getPaging(queryParams);
                setItems(result['items']);
                return {
                    data: items,
                    success: true,
                    total: result['total']
                };
            }}
            rowSelection={{
                // 自定义选择项参考: https://ant.design/components/table-cn/#components-table-demo-row-selection-custom
                // 注释该行则默认不显示下拉选项
                selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT],
                selectedRowKeys: selectedRowKeys,
                onChange: (keys) => {
                    setSelectedRowKeys(keys);
                }
            }}
            dataSource={items}
            rowKey="id"
            search={{
                labelWidth: 'auto',
            }}
            pagination={{
                defaultPageSize: 10,
                showSizeChanger: true
            }}
            dateFormatter="string"
            headerTitle="资产列表"
            toolBarRender={() => {
                return [
                    <Show menu={'asset-add'}>
                        <Button key="add" type="primary" onClick={() => {
                            setVisible(true)
                        }}>
                            新建
                        </Button>
                    </Show>,
                    <Show menu={'asset-import'}>
                        <Popover content={importExampleContent}>
                            <Upload
                                maxCount={1}
                                beforeUpload={handleImportAsset}
                                showUploadList={false}
                            >
                                <Button key='import'>导入</Button>
                            </Upload>
                        </Popover>
                    </Show>,
                    <Show menu={'asset-del'}>
                        <Button key="delete" danger
                                type="primary"
                                disabled={selectedRowKeys.length === 0}
                                onClick={() => {
                                    Modal.confirm({
                                        title: '您确定要删除选中的行吗?',
                                        content: '删除之后无法进行恢复，请慎重考虑。',
                                        okText: '确定',
                                        okType: 'danger',
                                        cancelText: '取消',
                                        onOk: async () => {
                                            await api.deleteById(selectedRowKeys.join(","));
                                            actionRef.current.reload();
                                            setSelectedRowKeys([]);
                                        }
                                    });
                                }}>
                            删除
                        </Button>
                    </Show>,
                    <Show menu={'asset-conn-test'}>
                        <Button key="connTest"
                                type="primary"
                                disabled={selectedRowKeys.length === 0}
                                onClick={connTestInBatch}>
                            连通性测试
                        </Button>
                    </Show>
                ];
            }}
        />

        <AssetModal
            id={selectedRowKey}
            copied={copied}
            visible={visible}
            confirmLoading={confirmLoading}
            handleCancel={() => {
                setVisible(false);
                setSelectedRowKey(undefined);
                setCopied(false);
            }}
            handleOk={async (values) => {
                setConfirmLoading(true);

                try {
                    let success;
                    if (values['id']) {
                        success = await api.updateById(values['id'], values);
                    } else {
                        success = await api.create(values);
                    }
                    if (success) {
                        setVisible(false);
                    }
                    actionRef.current.reload();
                } finally {
                    setConfirmLoading(false);
                    setSelectedRowKey(undefined);
                    setCopied(false);
                }
            }}
        />

        <ChangeOwner
            lastOwner={selectedRow?.owner}
            open={changeOwnerVisible}
            handleOk={async (owner) => {
                let success = await api.changeOwner(selectedRow?.id, owner);
                if (success) {
                    setChangeOwnerVisible(false);
                    actionRef.current.reload();
                }
            }}
            handleCancel={() => {
                setChangeOwnerVisible(false);
            }}
        />

    </Content>);
}

export default Asset;
