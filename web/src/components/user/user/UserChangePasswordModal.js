import React from 'react';
import {Form, Input, Modal} from "antd";
import {LockOutlined} from "@ant-design/icons";

const UserChangePasswordModal = ({visible, handleOk, handleCancel, confirmLoading}) => {

    const [form] = Form.useForm();

    return (
        <div>
            <Modal
                title="修改密码"
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

                <Form form={form}>
                    <Form.Item name='password' rules={[{required: true, message: '请输入新密码'}]}>
                        <Input prefix={<LockOutlined/>} placeholder="请输入新密码"/>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default UserChangePasswordModal;