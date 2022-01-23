import React, {useState} from 'react';
import {Form, Input, InputNumber, Modal, Select} from "antd/lib/index";

const formItemLayout = {
    labelCol: {span: 6},
    wrapperCol: {span: 14},
};

const {TextArea} = Input;

const AccessGatewayModal = ({title, visible, handleOk, handleCancel, confirmLoading, model}) => {

    const [form] = Form.useForm();

    if (model['accountType'] === undefined) {
        model['accountType'] = 'password';
    }

    if (model['port'] === undefined) {
        model['port'] = 22;
    }

    let [accountType, setAccountType] = useState(model.accountType);

    const handleAccountTypeChange = v => {
        setAccountType(v);
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

                <Form.Item label="网关名称" name='name' rules={[{required: true, message: "请输入网关名称"}]}>
                    <Input placeholder="网关名称"/>
                </Form.Item>

                <Form.Item label="主机" name='ip' rules={[{required: true, message: '请输入网关的主机名称或者IP地址'}]}>
                    <Input placeholder="网关的主机名称或者IP地址"/>
                </Form.Item>

                <Form.Item label="端口号" name='port' rules={[{required: true, message: '请输入端口'}]}>
                    <InputNumber min={1} max={65535} placeholder='TCP端口'/>
                </Form.Item>

                <Form.Item label="账户类型" name='accountType'
                           rules={[{required: true, message: '请选择接账户类型'}]}>
                    <Select onChange={handleAccountTypeChange}>
                        <Select.Option key='password' value='password'>密码</Select.Option>
                        <Select.Option key='private-key' value='private-key'>密钥</Select.Option>
                    </Select>
                </Form.Item>

                {
                    accountType === 'password' ?
                        <>
                            <input type='password' hidden={true} autoComplete='new-password'/>
                            <Form.Item label="授权账户" name='username'
                                       rules={[{required: true}]}>
                                <Input placeholder="root"/>
                            </Form.Item>

                            <Form.Item label="授权密码" name='password'
                                       rules={[{required: true}]}>
                                <Input.Password placeholder="password"/>
                            </Form.Item>
                        </>
                        :
                        <>
                            <Form.Item label="授权账户" name='username' rules={[{required: true}]}>
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
                }
            </Form>
        </Modal>
    )
};

export default AccessGatewayModal;
