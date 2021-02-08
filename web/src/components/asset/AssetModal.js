import React, {useState} from 'react';
import {Form, Input, InputNumber, Modal, Radio, Select, Tooltip} from "antd/lib/index";

const {TextArea} = Input;
const {Option} = Select;

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

const AssetModal = function ({title, visible, handleOk, handleCancel, confirmLoading, credentials, tags, model}) {

    const [form] = Form.useForm();

    let [accountType, setAccountType] = useState(model.accountType);

    let initAccountTypes = []
    if (model.protocol) {
        initAccountTypes = protocolMapping[model.protocol];
    }
    let [accountTypes, setAccountTypes] = useState(initAccountTypes);

    for (let key in model) {
        if (model.hasOwnProperty(key)) {
            if (model[key] === '-') {
                model[key] = '';
            }
        }
    }

    const formItemLayout = {
        labelCol: {span: 6},
        wrapperCol: {span: 14},
    };

    const handleProtocolChange = e => {
        let port;
        switch (e.target.value) {
            case 'ssh':
                port = 22;
                setAccountTypes(protocolMapping['ssh']);
                form.setFieldsValue({
                    accountType: 'custom',
                });
                handleAccountTypeChange('custom');
                break;
            case 'rdp':
                port = 3389;
                setAccountTypes(protocolMapping['rdp']);
                form.setFieldsValue({
                    accountType: 'custom',
                });
                handleAccountTypeChange('custom');
                break;
            case 'vnc':
                port = 5900;
                setAccountTypes(protocolMapping['vnc']);
                form.setFieldsValue({
                    accountType: 'custom',
                });
                handleAccountTypeChange('custom');
                break;
            case 'telnet':
                port = 23;
                setAccountTypes(protocolMapping['telnet']);
                form.setFieldsValue({
                    accountType: 'custom',
                });
                handleAccountTypeChange('custom');
                break;
            default:
                port = 65535;
        }

        form.setFieldsValue({
            port: port,
        });
    };

    const handleAccountTypeChange = v => {
        setAccountType(v);
        model.accountType = v;
    }

    return (

        <Modal
            title={title}
            visible={visible}
            maskClosable={false}
            onOk={() => {
                form
                    .validateFields()
                    .then(values => {
                        form.resetFields();
                        handleOk(values);
                    })
                    .catch(info => {
                    });
            }}
            onCancel={handleCancel}
            confirmLoading={confirmLoading}
            okText='确定'
            cancelText='取消'
        >

            <Form form={form} {...formItemLayout} initialValues={model}>
                <Form.Item name='id' noStyle>
                    <Input hidden={true}/>
                </Form.Item>

                <Form.Item label="资产名称" name='name' rules={[{required: true, message: "请输入资产名称"}]}>
                    <Input placeholder="资产名称"/>
                </Form.Item>

                <Form.Item label="主机" name='ip' rules={[{required: true, message: '请输入资产的主机名称或者IP地址'}]}>
                    <Input placeholder="资产的主机名称或者IP地址"/>
                </Form.Item>

                <Form.Item label="接入协议" name='protocol' rules={[{required: true, message: '请选择接入协议'}]}>
                    <Radio.Group onChange={handleProtocolChange}>
                        <Radio value="rdp">rdp</Radio>
                        <Radio value="ssh">ssh</Radio>
                        <Radio value="vnc">vnc</Radio>
                        <Radio value="telnet">telnet</Radio>
                    </Radio.Group>
                </Form.Item>

                <Form.Item label="端口号" name='port' rules={[{required: true, message: '请输入资产端口'}]}>
                    <InputNumber min={1} max={65535}/>
                </Form.Item>

                <Form.Item label="账户类型" name='accountType' rules={[{required: true, message: '请选择接账户类型'}]}>
                    <Select onChange={handleAccountTypeChange}>
                        {accountTypes.map(item => {
                            return (<Option key={item.value} value={item.value}>{item.text}</Option>)
                        })}
                    </Select>
                </Form.Item>

                {
                    accountType === 'credential' ?
                        <Form.Item label="授权凭证" name='credentialId' rules={[{required: true, message: '请选择授权凭证'}]}>
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
                        : null
                }

                {
                    accountType === 'custom' ?
                        <>
                            <Form.Item label="授权账户" name='username' noStyle={!(accountType === 'custom')}>
                                <Input placeholder="输入授权账户"/>
                            </Form.Item>

                            <Form.Item label="授权密码" name='password' noStyle={!(accountType === 'custom')}>
                                <Input.Password placeholder="输入授权密码"/>
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

                            <Form.Item label="私钥" name='privateKey' rules={[{required: true, message: '请输入私钥'}]}>
                                <TextArea rows={4}/>
                            </Form.Item>
                            <Form.Item label="私钥密码" name='passphrase'>
                                <TextArea rows={1}/>
                            </Form.Item>
                        </>
                        : null
                }

                <Form.Item label="标签" name='tags'>
                    <Select mode="tags" placeholder="请选择标签">
                        {tags.map(tag => {
                            if (tag === '-') {
                                return undefined;
                            }
                            return (<Option key={tag}>{tag}</Option>)
                        })}
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    )
}

export default AssetModal;
