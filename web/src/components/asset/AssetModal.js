import React, {useEffect, useState} from 'react';
import {Form, Input, InputNumber, Modal, Radio, Select, Tooltip} from "antd/lib/index";

const {TextArea} = Input;
const {Option} = Select;

// 子级页面
// Ant form create 表单内置方法

const AssetModal = function ({title, visible, handleOk, handleCancel, confirmLoading, credentials, model}) {

    const [form] = Form.useForm();

    let [accountType, setAccountType] = useState(model.accountType);

    useEffect(() => {
        setAccountType(model.accountType);
    });

    const formItemLayout = {
        labelCol: {span: 6},
        wrapperCol: {span: 14},
    };

    const handleProtocolChange = e => {
        let port;
        switch (e.target.value) {
            case 'ssh':
                port = 22;
                break;
            case 'rdp':
                port = 3389;
                break;
            case 'vnc':
                port = 5901;
                form.setFieldsValue({
                    accountType: 'custom',
                });
                break;
            case 'telnet':
                port = 23;
                break;
            default:
                port = 65535;
        }

        form.setFieldsValue({
            port: port,
        });
    };

    return (

        <Modal
            title={title}
            visible={visible}
            maskClosable={true}
            onOk={() => {
                form
                    .validateFields()
                    .then(values => {
                        form.resetFields();
                        handleOk(values);
                    })
                    .catch(info => {});
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
                    <Input placeholder="请输入资产名称"/>
                </Form.Item>

                <Form.Item label="IP" name='ip' rules={[{required: true, message: '请输入资产IP'}]}>
                    <Input placeholder="请输入资产IP"/>
                </Form.Item>

                <Form.Item label="接入协议" name='protocol' rules={[{required: true, message: '请选择接入协议'}]}>
                    <Radio.Group onChange={handleProtocolChange}>
                        <Radio value="rdp">rdp</Radio>
                        <Radio value="ssh">ssh</Radio>
                        <Radio value="vnc">vnc</Radio>
                        <Radio value="telnet">telnet</Radio>
                    </Radio.Group>
                </Form.Item>

                <Form.Item label="端口" name='port' rules={[{required: true, message: '请输入资产端口'}]}>
                    <InputNumber min={1} max={65535}/>
                </Form.Item>

                <Form.Item label="账户类型" name='accountType' rules={[{required: true, message: '请选择接账户类型'}]}>
                    <Select onChange={(v) => {
                        setAccountType(v);
                        model.accountType = v;
                    }}>
                        <Option value="custom">自定义</Option>
                        <Option value="credential">授权凭证</Option>
                        <Option value="secret-key">密钥</Option>
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
                            <Form.Item label="授权账户" name='username' rules={[{required: true, message: '请输入授权账户'}]}
                                       noStyle={!(accountType === 'custom')}>
                                <Input placeholder="输入授权账户"/>
                            </Form.Item>

                            <Form.Item label="授权密码" name='password' rules={[{required: true, message: '请输入授权密码'}]}
                                       noStyle={!(accountType === 'custom')}>
                                <Input placeholder="输入授权密码"/>
                            </Form.Item>
                        </>
                        : null
                }

                {
                    accountType === 'secret-key' ?
                        <Form.Item label="私钥" name='passphrase' rules={[{required: true, message: '请输入私钥'}]}>
                            <TextArea rows={4}/>
                        </Form.Item>
                        : null
                }
            </Form>
        </Modal>
    )
}

export default AssetModal;
