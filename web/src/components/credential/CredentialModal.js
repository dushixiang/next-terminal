import React from 'react';
import {Form, Input, Modal} from "antd/lib/index";

const CredentialModal = ({title, visible, handleOk, handleCancel, confirmLoading,model}) => {

    const [form] = Form.useForm();

    const formItemLayout = {
        labelCol: {span: 6},
        wrapperCol: {span: 14},
    };

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

                <Form.Item label="凭证名称" name='name' rules={[{required: true, message: '请输入凭证名称'}]}>
                    <Input placeholder="请输入凭证名称"/>
                </Form.Item>

                <Form.Item label="授权账户" name='username' rules={[{required: true, message: '请输入授权账户'}]}>
                    <Input placeholder="输入授权账户"/>
                </Form.Item>

                <Form.Item label="授权密码" name='password' rules={[{required: true, message: '请输入授权密码',}]}>
                    <Input placeholder="输入授权密码"/>
                </Form.Item>

            </Form>
        </Modal>
    )
};

export default CredentialModal;
