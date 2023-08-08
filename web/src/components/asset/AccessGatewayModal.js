import React, {useEffect, useState} from 'react';
import {Form, Input, InputNumber, Modal, Select} from "antd";
import accessGatewayApi from "../../api/access-gateway";

const formItemLayout = {
    labelCol: {span: 6},
    wrapperCol: {span: 14},
};

const {TextArea} = Input;
const api = accessGatewayApi;

const AccessGatewayModal = ({
                                visible,
                                handleOk,
                                handleCancel,
                                confirmLoading,
                                id,
                            }) => {

    const [form] = Form.useForm();
    let [gatewayType, setGatewayType] = useState('ssh');
    let [accountType, setAccountType] = useState('password');

    const handleGatewayTypeChange = v => {
        setGatewayType(v);
        form.setFieldValue('port', v === 'ssh' ? 22 : 443)
    }

    const handleAccountTypeChange = v => {
        setAccountType(v);
    }

    useEffect(() => {

        const getItem = async () => {
            let data = await api.getById(id);
            if (data) {
                form.setFieldsValue(data);
                setGatewayType(data['gatewayType']);
                setAccountType(data['accountType']);
            }
        }

        if (visible) {
            if(id){
                getItem();
            }else {
                form.setFieldsValue({
                    gatewayType: 'ssh',
                    accountType: 'password',
                    port: 22,
                });
                // TODO: resolve this issue in guacd
                setGatewayType('ssh');
                setAccountType('password');
            }
        } else {
            form.resetFields();
        }
    }, [visible]);

    return (
        <Modal
            title={id ? '更新接入网关' : '新建接入网关'}
            visible={visible}
            maskClosable={false}
            destroyOnClose={true}
            onOk={() => {
                form
                    .validateFields()
                    .then(async values => {
                        let ok = await handleOk(values);
                        if (ok) {
                            form.resetFields();
                        }
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
            <Form form={form} {...formItemLayout}>
                <Form.Item name='id' noStyle>
                    <Input hidden={true}/>
                </Form.Item>
                <Form.Item label="网关类型" name='gatewayType'
                        rules={[{required: true, message: '请选择接网关类型'}]}>
                    <Select onChange={handleGatewayTypeChange}>
                        <Select.Option key='ssh' value='ssh'>SSH</Select.Option>
                        <Select.Option key='rdp' value='rdp'>RDP</Select.Option>
                    </Select>
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
                {gatewayType === 'ssh' &&
                <>
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
                </>
            }
            </Form>
        </Modal>
    )
};

export default AccessGatewayModal;
