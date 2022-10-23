import React, {useEffect, useState} from 'react';
import {Form, Input, Modal, Select} from "antd";
import credentialApi from "../../api/credential";

const {TextArea} = Input;
const api = credentialApi;

const accountTypes = [
    {text: '密码', value: 'custom'},
    {text: '密钥', value: 'private-key'},
];

const CredentialModal = ({
                             visible,
                             handleOk,
                             handleCancel,
                             confirmLoading,
                             id,
                         }) => {

    const [form] = Form.useForm();

    const formItemLayout = {
        labelCol: {span: 6},
        wrapperCol: {span: 14},
    };

    let [type, setType] = useState('');

    const handleAccountTypeChange = v => {
        setType(v);
    }

    useEffect(() => {

        const getItem = async () => {
            let data = await api.getById(id);
            if (data) {
                form.setFieldsValue(data);
                setType(data['type']);
            }
        }


        if (visible) {
            if (id) {
                getItem();
            }else {
                form.setFieldsValue({
                    type: 'custom',
                });
            }
        } else {
            form.resetFields();
        }
    }, [visible]);

    return (

        <Modal
            title={id ? '更新授权凭证' : '新建授权凭证'}
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

                <Form.Item label="凭证名称" name='name' rules={[{required: true, message: '请输入凭证名称'}]}>
                    <Input placeholder="请输入凭证名称"/>
                </Form.Item>

                <Form.Item label="账户类型" name='type' rules={[{required: true, message: '请选择接账户类型'}]}>
                    <Select onChange={handleAccountTypeChange}>
                        {accountTypes.map(item => {
                            return (<Select.Option key={item.value} value={item.value}>{item.text}</Select.Option>)
                        })}
                    </Select>
                </Form.Item>

                {
                    type === 'private-key' ?
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
                        :
                        <>
                            <input type='password' hidden={true} autoComplete='new-password'/>
                            <Form.Item label="授权账户" name='username'>
                                <Input placeholder="输入授权账户"/>
                            </Form.Item>

                            <Form.Item label="授权密码" name='password'>
                                <Input.Password placeholder="输入授权密码"/>
                            </Form.Item>
                        </>

                }

            </Form>
        </Modal>
    )
};

export default CredentialModal;
