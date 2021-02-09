import React from 'react';
import {Form, Input, Modal, Radio} from "antd/lib/index";

const UserModal = ({title, visible, handleOk, handleCancel, confirmLoading, model}) => {

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
            centered={true}
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

                <Form.Item label="登录账户" name='username' rules={[{required: true, message: '请输入登录账户'}]}>
                    <Input autoComplete="off" placeholder="请输入登录账户"/>
                </Form.Item>

                <Form.Item label="用户昵称" name='nickname' rules={[{required: true, message: '请输入用户昵称'}]}>
                    <Input placeholder="请输入用户昵称"/>
                </Form.Item>

                <Form.Item label="用户类型" name='type' rules={[{required: true, message: '请选择用户角色'}]}>
                    <Radio.Group >
                        <Radio value={'user'}>普通用户</Radio>
                        <Radio value={'admin'}>管理用户</Radio>
                    </Radio.Group>
                </Form.Item>

                {
                    title.indexOf('新增') > -1 ?
                        (<Form.Item label="登录密码" name='password' rules={[{required: true, message: '请输入登录密码'}]}>
                            <Input type="password" autoComplete="new-password" placeholder="输入登录密码"/>
                        </Form.Item>) : null
                }

            </Form>
        </Modal>
    )
};

export default UserModal;
