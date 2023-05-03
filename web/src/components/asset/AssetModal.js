import React, {useEffect, useState} from 'react';
import {Collapse, Form, Input, InputNumber, Modal, Radio, Select, Switch, Tabs, Tooltip, Typography} from "antd";
import request from "../../common/request";
import assetApi from "../../api/asset";
import tagApi from "../../api/tag";
import credentialApi from "../../api/credential";
import arrays from "../../utils/array";
import strings from "../../utils/strings";
import {ControlOutlined, DesktopOutlined} from "@ant-design/icons";
import './AssetModal.css'

const {TextArea} = Input;
const {Option} = Select;
const {Text} = Typography;
const {Panel} = Collapse;

// 子级页面
// Ant form create 表单内置方法

const protocolMapping = {
    'ssh': [
        {text: '密码', value: 'custom'},
        {text: '密钥', value: 'private-key'},
        {text: '授权凭证', value: 'credential'},
    ],
    'rdp': [{text: '密码', value: 'custom'}, {text: '授权凭证', value: 'credential'}],
    'vnc': [{text: '密码', value: 'custom'}, {text: '授权凭证', value: 'credential'}],
    'telnet': [{text: '密码', value: 'custom'}, {text: '授权凭证', value: 'credential'}]
}

const formLayout = {
    labelCol: {span: 6},
    wrapperCol: {span: 16},
};

const TELENETFormItemLayout = {
    labelCol: {span: 6},
    wrapperCol: {span: 14},
};

const AssetModal = function ({
                                 visible,
                                 handleOk,
                                 handleCancel,
                                 confirmLoading,
                                 id,
                                 copied
                             }) {

    const [form] = Form.useForm();

    let [accountType, setAccountType] = useState('custom');
    let [protocol, setProtocol] = useState('rdp');
    let [protocolOptions, setProtocolOptions] = useState(protocolMapping['rdp']);
    let [useSSL, setUseSSL] = useState(false);
    let [storages, setStorages] = useState([]);
    let [enableDrive, setEnableDrive] = useState(false);
    let [socksProxyEnable, setSocksProxyEnable] = useState(false);

    let [accessGateways, setAccessGateways] = useState([]);
    let [tags, setTags] = useState([]);
    let [credentials, setCredentials] = useState([]);

    const getStorages = async () => {
        const result = await request.get('/storages/shares');
        if (result.code === 1) {
            setStorages(result['data']);
        }
    }

    useEffect(() => {

        const getItem = async () => {
            let asset = await assetApi.getById(id);
            if (asset) {
                asset['use-ssl'] = asset['use-ssl'] === 'true';
                asset['ignore-cert'] = asset['ignore-cert'] === 'true';
                asset['enable-drive'] = asset['enable-drive'] === 'true';
                asset['socks-proxy-enable'] = asset['socks-proxy-enable'] === 'true';
                asset['force-lossless'] = asset['force-lossless'] === 'true';
                for (let key in asset) {
                    if (asset.hasOwnProperty(key)) {
                        if (asset[key] === '-') {
                            asset[key] = '';
                        }
                    }
                }
                if (strings.hasText(asset['tags'])) {
                    asset['tags'] = asset['tags'].split(',');
                } else {
                    asset['tags'] = [];
                }
                setAccountType(asset['accountType']);
                if (asset['accountType'] === 'credential') {
                    getCredentials();
                }
                setProtocolOptions(protocolMapping[asset['protocol']]);
                setProtocol(asset['protocol']);
                setUseSSL(asset['use-ssl']);
                setEnableDrive(asset['enable-drive']);
                setSocksProxyEnable(asset['socks-proxy-enable']);
                form.setFieldsValue(asset);
            }
        }

        const getAccessGateways = async () => {
            const result = await request.get('/access-gateways');
            if (result.code === 1) {
                setAccessGateways(result['data']);
            }
        }

        const getTags = async () => {
            let tags = await tagApi.getAll();
            setTags(tags);
        }

        if (visible) {
            if (id) {
                getItem();
            }
            getTags();
            getAccessGateways();
        } else {
            form.setFieldsValue({
                'accountType': accountType,
                'protocol': protocol,
                'port': 3389,
                'enable-drive': false,
                'force-lossless': false,
                'socks-proxy-enable': false,
                'ignore-cert': false,
                'use-ssl': false,
            });
        }

    }, [visible]);

    const handleProtocolChange = e => {
        setProtocol(e.target.value)
        let port;
        switch (e.target.value) {
            case 'ssh':
                port = 22;
                setProtocolOptions(protocolMapping['ssh']);
                form.setFieldsValue({accountType: 'custom',});
                handleAccountTypeChange('custom');
                break;
            case 'rdp':
                port = 3389;
                setProtocolOptions(protocolMapping['rdp']);
                form.setFieldsValue({accountType: 'custom',});
                handleAccountTypeChange('custom');
                break;
            case 'vnc':
                port = 5900;
                setProtocolOptions(protocolMapping['vnc']);
                form.setFieldsValue({accountType: 'custom',});
                handleAccountTypeChange('custom');
                break;
            case 'telnet':
                port = 23;
                setProtocolOptions(protocolMapping['telnet']);
                form.setFieldsValue({accountType: 'custom',});
                handleAccountTypeChange('custom');
                break;
            case 'kubernetes':
                port = 6443;
                break
            default:
                port = 65535;
        }

        form.setFieldsValue({
            port: port,
        });
    };

    const getCredentials = async () => {
        let items = await credentialApi.getAll();
        setCredentials(items);
    }

    const handleAccountTypeChange = v => {
        setAccountType(v);
        if (v === 'credential') {
            getCredentials();
        }
    }

    const basicView = <div className='basic' style={{marginTop: 16}}>
        <Form.Item label="资产名称" name='name' rules={[{required: true, message: "请输入资产名称"}]}>
            <Input placeholder="资产名称"/>
        </Form.Item>

        <Form.Item label="协议" name='protocol' rules={[{required: true, message: '请选择接入协议'}]}>
            <Radio.Group onChange={handleProtocolChange}>
                <Radio value="rdp">RDP</Radio>
                <Radio value="ssh">SSH</Radio>
                <Radio value="vnc">VNC</Radio>
                <Radio value="telnet">Telnet</Radio>
                <Radio value="kubernetes">Kubernetes</Radio>
            </Radio.Group>
        </Form.Item>

        <Form.Item label="主机地址" rules={[{required: true, message: '请输入资产的主机名称和IP地址'}]}>
            <Input.Group compact>
                <Form.Item noStyle name='ip'>
                    <Input style={{width: '80%'}} placeholder="资产的主机名称或者IP地址"/>
                </Form.Item>

                <Form.Item noStyle name='port'>
                    <InputNumber style={{width: '20%'}} min={1} max={65535} placeholder='TCP端口'/>
                </Form.Item>
            </Input.Group>
        </Form.Item>


        {
            protocol === 'kubernetes' ? <>
                <Form.Item
                    name="namespace"
                    label="命名空间"
                >
                    <Input type='text' placeholder="为空时默认使用default命名空间"/>
                </Form.Item>

                <Form.Item
                    name="pod"
                    label="pod"
                    rules={[{required: true, message: '请输入Pod名称'}]}
                >
                    <Input type='text' placeholder="Kubernetes Pod的名称，其中包含与之相连的容器。"/>
                </Form.Item>

                <Form.Item
                    name="container"
                    label="容器"
                >
                    <Input type='text' placeholder="为空时默认使用第一个容器"/>
                </Form.Item>
            </> : <>
                <Form.Item label="账户类型" name='accountType'
                           rules={[{required: true, message: '请选择接账户类型'}]}>
                    <Select onChange={handleAccountTypeChange}>
                        {protocolOptions.map(item => {
                            return (
                                <Option key={item.value} value={item.value}>{item.text}</Option>)
                        })}
                    </Select>
                </Form.Item>


                {
                    accountType === 'credential' ?
                        <>
                            <Form.Item label="授权凭证" name='credentialId'
                                       rules={[{required: true, message: '请选择授权凭证'}]}>
                                <Select onChange={() => null}>
                                    {credentials.map(item => {
                                        return (
                                            <Option key={item.id} value={item.id}>
                                                <Tooltip placement="topLeft" title={item.name}>
                                                    {item.name}
                                                </Tooltip>
                                            </Option>
                                        );
                                    })}
                                </Select>
                            </Form.Item>
                        </>
                        : null
                }

                {
                    accountType === 'custom' ?
                        <>
                            <input type='password' hidden={true} autoComplete='new-password'/>
                            <Form.Item label="授权账户" name='username'>
                                <Input autoComplete="off" placeholder="输入授权账户"/>
                            </Form.Item>

                            <Form.Item label="授权密码" name='password'>
                                <Input.Password autoComplete="off" placeholder="输入授权密码"/>
                            </Form.Item>
                        </>
                        : null
                }

                {
                    accountType === 'private-key' ?
                        <>
                            <Form.Item label="授权账户" name='username'>
                                <Input placeholder="输入授权账户"/>
                            </Form.Item>

                            <Form.Item label="私钥" name='privateKey'
                                       rules={[{required: true, message: '请输入私钥'}]}>
                                <TextArea rows={4}/>
                            </Form.Item>
                            <Form.Item label="私钥密码" name='passphrase'>
                                <TextArea rows={1}/>
                            </Form.Item>
                        </>
                        : null
                }
            </>
        }

        <Form.Item label="接入网关" name='accessGatewayId' tooltip={'需要从接入网关才能访问的目标机器必选'}>
            <Select onChange={() => null} allowClear={true}>
                {accessGateways.map(item => {
                    return (
                        <Option key={item.id} value={item.id} placeholder={'需要从接入网关才能访问的目标机器必选'}>
                            <Tooltip placement="topLeft" title={item.name}>
                                {item.name}
                            </Tooltip>
                        </Option>
                    );
                })}
            </Select>
        </Form.Item>

        <Form.Item label="标签" name='tags'>
            <Select mode="tags" placeholder="标签可以更加方便的检索资产">
                {tags.map(tag => {
                    if (tag === '-') {
                        return undefined;
                    }
                    return (<Option key={tag}>{tag}</Option>)
                })}
            </Select>
        </Form.Item>

        <Form.Item label="备注" name='description'>
            <TextArea rows={4} placeholder='关于资产的一些信息您可以写在这里'/>
        </Form.Item>
    </div>;

    const advancedView = <div className='advanced'>
        <Collapse
            defaultActiveKey={['VNC中继', 'storage', '模式设置', '显示设置', '控制终端行为', 'socks']}
            ghost>
            {
                protocol === 'rdp' ?
                    <>
                        <Panel header={<Text strong>显示设置</Text>} key="显示设置">
                            <Form.Item
                                name="color-depth"
                                label="色彩深度"
                                initialValue=""
                            >
                                <Select onChange={null}>
                                    <Option value="">默认</Option>
                                    <Option value="16">低色（16位）</Option>
                                    <Option value="24">真彩（24位）</Option>
                                    <Option value="32">真彩（32位）</Option>
                                    <Option value="8">256色</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item
                                name="force-lossless"
                                label="无损压缩"
                                valuePropName="checked"
                                rules={[
                                    {
                                        required: true,
                                    },
                                ]}
                            >
                                <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                            </Form.Item>
                        </Panel>
                        <Panel header={<Text strong>认证</Text>} key="认证">
                            <Form.Item
                                name="domain"
                                label='域'
                            >
                                <Input type='text' placeholder="身份验证时使用的域"/>
                            </Form.Item>
                        </Panel>
                        <Panel header={<Text strong>预连接 PDU (Hyper-V / VMConnect)</Text>} key="PDU">
                            <Form.Item
                                name="preconnection-id"
                                label='预连接ID'
                            >
                                <Input type='text' placeholder="RDP 源的数字 ID"/>
                            </Form.Item>

                            <Form.Item
                                name="preconnection-blob"
                                label='预连接字符'
                            >
                                <Input type='text' placeholder="标识 RDP 源的任意字符串"/>
                            </Form.Item>
                        </Panel>
                        <Panel header={<Text strong>Remote App</Text>} key="remote-app">
                            <Form.Item
                                name="remote-app"
                                label='程序'
                                tooltip="指定在远程桌面上启动的RemoteApp。
如果您的远程桌面服务器支持该应用程序，则该应用程序(且仅该应用程序)对用户可见。

Windows需要对远程应用程序的名称使用特殊的符号。
远程应用程序的名称必须以两个竖条作为前缀。
例如，如果您已经在您的服务器上为notepad.exe创建了一个远程应用程序，并将其命名为“notepad”，则您将该参数设置为:“||notepad”。"
                            >
                                <Input type='text' placeholder="remote app"/>
                            </Form.Item>

                            <Form.Item
                                name="remote-app-dir"
                                label='工作目录'
                                tooltip='remote app的工作目录，如果未配置remote app，此参数无效。'
                            >
                                <Input type='text' placeholder="remote app的工作目录"/>
                            </Form.Item>

                            <Form.Item
                                name="remote-app-args"
                                label='参数'
                                tooltip='remote app的命令行参数，如果未配置remote app，此参数无效。'
                            >
                                <Input type='text' placeholder="remote app的命令行参数"/>
                            </Form.Item>
                        </Panel>
                        <Panel header={<Text strong>映射网络驱动器</Text>} key="storage">
                            <Form.Item
                                name="enable-drive"
                                label="启用"
                                valuePropName="checked"
                            >
                                <Switch checkedChildren="开启" unCheckedChildren="关闭"
                                        onChange={async (checked, event) => {
                                            setEnableDrive(checked);
                                            if (checked === true) {
                                                getStorages();
                                            }
                                        }}/>
                            </Form.Item>
                            {
                                enableDrive ?
                                    <Form.Item
                                        name="drive-path"
                                        label="映射空间"
                                        extra='用于文件传输的映射网络驱动器，为空时使用操作人的默认空间'
                                    >
                                        <Select onChange={null} allowClear
                                                placeholder='为空时使用操作人的默认空间'>
                                            {
                                                storages.map(item => {
                                                    return <Option
                                                        value={item['id']}>{item['name']}</Option>
                                                })
                                            }
                                        </Select>
                                    </Form.Item> : undefined
                            }

                        </Panel>
                    </> : undefined
            }

            {
                protocol === 'ssh' ?
                    <>
                        <Panel header={<Text strong>Socks 代理</Text>} key="socks">
                            <Form.Item name='ssh-mode' noStyle>
                                <Input hidden={true} value={'native'}/>
                            </Form.Item>
                            <Form.Item
                                name="socks-proxy-enable"
                                label="使用Socks代理"
                                valuePropName="checked"
                            >
                                <Switch checkedChildren="是" unCheckedChildren="否"
                                        onChange={(checked, event) => {
                                            setSocksProxyEnable(checked);
                                        }}/>
                            </Form.Item>

                            {
                                socksProxyEnable ? <>
                                    <Form.Item label="代理地址" name='socks-proxy-host'
                                               rules={[{required: true}]}>
                                        <Input placeholder="Socks 代理的主机地址"/>
                                    </Form.Item>

                                    <Form.Item label="代理端口" name='socks-proxy-port'
                                               rules={[{required: true}]}>
                                        <InputNumber min={1} max={65535}
                                                     placeholder='Socks 代理的主机端口'/>
                                    </Form.Item>

                                    <input type='password' hidden={true}
                                           autoComplete='new-password'/>
                                    <Form.Item label="代理账号" name='socks-proxy-username'>
                                        <Input autoComplete="off" placeholder="代理账号，没有可以不填"/>
                                    </Form.Item>

                                    <Form.Item label="代理密码" name='socks-proxy-password'>
                                        <Input.Password autoComplete="off"
                                                        placeholder="代理密码，没有可以不填"/>
                                    </Form.Item>
                                </> : undefined
                            }
                        </Panel>

                    </> : undefined
            }

            {
                protocol === 'vnc' ?
                    <>
                        <Panel header={<Text strong>显示设置</Text>} key="显示设置">
                            <Form.Item
                                name="color-depth"
                                label="色彩深度"
                                initialValue=""
                            >
                                <Select onChange={null}>
                                    <Option value="">默认</Option>
                                    <Option value="16">低色（16位）</Option>
                                    <Option value="24">真彩（24位）</Option>
                                    <Option value="32">真彩（32位）</Option>
                                    <Option value="8">256色</Option>
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="cursor"
                                label="光标"
                                initialValue=""
                            >
                                <Select onChange={null}>
                                    <Option value="">默认</Option>
                                    <Option value="local">本地</Option>
                                    <Option value="remote">远程</Option>
                                </Select>
                            </Form.Item>
                        </Panel>
                        <Panel header={<Text strong>VNC中继</Text>} key="VNC中继">
                            <Form.Item label='目标主机'
                                       tooltip='连接到VNC代理（例如UltraVNC Repeater）时要请求的目标主机。'
                                       name='dest-host'>
                                <Input placeholder="目标主机"/>
                            </Form.Item>
                            <Form.Item label='目标端口'
                                       tooltip='连接到VNC代理（例如UltraVNC Repeater）时要请求的目标端口。'
                                       name='dest-port'>
                                <Input type='number' min={1} max={65535}
                                       placeholder='目标端口'/>
                            </Form.Item>
                        </Panel>
                    </> : undefined
            }

            {
                protocol === 'telnet' ?
                    <>
                        <Panel header={<Text strong>认证</Text>} key="认证">
                            <Form.Item
                                {...TELENETFormItemLayout}
                                name="username-regex"
                                label="用户名正则表达式"
                            >
                                <Input type='text' placeholder=""/>
                            </Form.Item>
                            <Form.Item
                                {...TELENETFormItemLayout}
                                name="password-regex"
                                label="密码正则表达式"
                            >
                                <Input type='text' placeholder=""/>
                            </Form.Item>
                            <Form.Item
                                {...TELENETFormItemLayout}
                                name="login-success-regex"
                                label="登录成功正则表达式"
                            >
                                <Input type='text' placeholder=""/>
                            </Form.Item>
                            <Form.Item
                                {...TELENETFormItemLayout}
                                name="login-failure-regex"
                                label="登录失败正则表达式"
                            >
                                <Input type='text' placeholder=""/>
                            </Form.Item>
                        </Panel>
                        <Panel header={<Text strong>显示设置</Text>} key="显示设置">
                            <Form.Item
                                name="color-scheme"
                                label="配色方案"
                                initialValue=""
                            >
                                <Select onChange={null}>
                                    <Option value="">默认</Option>
                                    <Option value="gray-black">黑底灰字</Option>
                                    <Option value="green-black">黑底绿字</Option>
                                    <Option value="white-black">黑底白字</Option>
                                    <Option value="black-white">白底黑字</Option>
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="font-name"
                                label="字体名称"
                            >
                                <Input type='text' placeholder="为空时使用系统默认字体"/>
                            </Form.Item>

                            <Form.Item
                                name="font-size"
                                label="字体大小"
                            >
                                <Input type='number' placeholder="为空时使用系统默认字体大小" min={8} max={96}/>
                            </Form.Item>
                        </Panel>
                        <Panel header={<Text strong>控制终端行为</Text>} key="控制终端行为">
                            <Form.Item
                                name="backspace"
                                label="退格键映射"
                                initialValue=""
                            >
                                <Select onChange={null}>
                                    <Option value="">默认</Option>
                                    <Option value="127">删除键(Ctrl-?)</Option>
                                    <Option value="8">退格键(Ctrl-H)</Option>
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="terminal-type"
                                label="终端类型"
                                initialValue=""
                            >
                                <Select onChange={null}>
                                    <Option value="">默认</Option>
                                    <Option value="ansi">ansi</Option>
                                    <Option value="linux">linux</Option>
                                    <Option value="vt100">vt100</Option>
                                    <Option value="vt220">vt220</Option>
                                    <Option value="xterm">xterm</Option>
                                    <Option value="xterm-256color">xterm-256color</Option>
                                </Select>
                            </Form.Item>
                        </Panel>
                    </> : undefined
            }

            {
                protocol === 'kubernetes' ?
                    <>
                        <Panel header={<Text strong>认证</Text>} key="认证">
                            <Form.Item
                                name="use-ssl"
                                label="使用SSL"
                                valuePropName="checked"
                            >
                                <Switch checkedChildren="是" unCheckedChildren="否"
                                        onChange={(checked, event) => {
                                            setUseSSL(checked);
                                        }}/>
                            </Form.Item>

                            {
                                useSSL ?
                                    <>
                                        <Form.Item
                                            name="client-cert"
                                            label="client-cert"
                                        >
                                            <Input type='text' placeholder=""/>
                                        </Form.Item>

                                        <Form.Item
                                            name="client-key"
                                            label="client-key"
                                        >
                                            <Input type='text' placeholder=""/>
                                        </Form.Item>

                                        <Form.Item
                                            name="ca-cert"
                                            label="ca-cert"
                                        >
                                            <Input type='text' placeholder=""/>
                                        </Form.Item>
                                    </> : undefined
                            }


                            <Form.Item
                                name="ignore-cert"
                                label="忽略证书"
                                valuePropName="checked"
                            >
                                <Switch checkedChildren="是" unCheckedChildren="否"
                                        onChange={(checked, event) => {

                                        }}/>
                            </Form.Item>

                        </Panel>
                        <Panel header={<Text strong>显示设置</Text>} key="显示设置">
                            <Form.Item
                                name="color-scheme"
                                label="配色方案"
                                initialValue=""
                            >
                                <Select onChange={null}>
                                    <Option value="">默认</Option>
                                    <Option value="gray-black">黑底灰字</Option>
                                    <Option value="green-black">黑底绿字</Option>
                                    <Option value="white-black">黑底白字</Option>
                                    <Option value="black-white">白底黑字</Option>
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="font-name"
                                label="字体名称"
                            >
                                <Input type='text' placeholder="为空时使用系统默认字体"/>
                            </Form.Item>

                            <Form.Item
                                name="font-size"
                                label="字体大小"
                            >
                                <Input type='number' placeholder="为空时使用系统默认字体大小" min={8} max={96}/>
                            </Form.Item>
                        </Panel>
                        <Panel header={<Text strong>控制终端行为</Text>} key="控制终端行为">
                            <Form.Item
                                name="backspace"
                                label="退格键映射"
                                initialValue=""
                            >
                                <Select onChange={null}>
                                    <Option value="">默认</Option>
                                    <Option value="127">删除键(Ctrl-?)</Option>
                                    <Option value="8">退格键(Ctrl-H)</Option>
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="terminal-type"
                                label="终端类型"
                                initialValue=""
                            >
                                <Select onChange={null}>
                                    <Option value="">默认</Option>
                                    <Option value="ansi">ansi</Option>
                                    <Option value="linux">linux</Option>
                                    <Option value="vt100">vt100</Option>
                                    <Option value="vt220">vt220</Option>
                                    <Option value="xterm">xterm</Option>
                                    <Option value="xterm-256color">xterm-256color</Option>
                                </Select>
                            </Form.Item>
                        </Panel>
                    </> : undefined
            }
        </Collapse>
    </div>;

    return (

        <Modal
            className={'asset-modal'}
            title={id && copied === false ? '更新资产' : '新建资产'}
            visible={visible}
            maskClosable={false}
            destroyOnClose={true}
            centered
            width={700}
            onOk={() => {
                form
                    .validateFields()
                    .then(async values => {
                        if (copied === true) {
                            values['id'] = undefined;
                        }
                        console.log(values['tags'], arrays.isEmpty(values['tags']))
                        if (!arrays.isEmpty(values['tags'])) {
                            values.tags = values['tags'].join(',');
                        } else {
                            values.tags = '';
                        }
                        form.resetFields();
                        await handleOk(values);
                    });
            }}
            onCancel={() => {
                form.resetFields();
                handleCancel();
            }}
            confirmLoading={confirmLoading}
            okText='确定'
            cancelText='取消'
        >

            <Form form={form} {...formLayout}>
                <Form.Item name='id' noStyle>
                    <Input hidden={true}/>
                </Form.Item>

                <Tabs
                    defaultActiveKey="basic"
                    items={[
                        {
                            label: <span><DesktopOutlined/>基础信息</span>,
                            key: 'basic',
                            children: basicView,
                        },
                        {
                            label: <span><ControlOutlined/>高级配置</span>,
                            key: 'advanced',
                            children: advancedView,
                        },
                    ]}
                />

            </Form>
        </Modal>
    )
}

export default AssetModal;
