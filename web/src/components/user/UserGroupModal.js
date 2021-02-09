import React from 'react';
import {Form, Input, Modal, Select} from "antd/lib/index";

const UserGroupModal = ({
                            title,
                            visible,
                            handleOk,
                            handleCancel,
                            confirmLoading,
                            model,
                            users,
                        }) => {

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
            destroyOnClose={true}
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

                <Form.Item label="名称" name='name' rules={[{required: true, message: '请输入用户组名称'}]}>
                    <Input autoComplete="off" placeholder="请输入用户组名称"/>
                </Form.Item>

                <Form.Item label="用户组成员" name='members'>
                    <Select
                        // showSearch
                        mode="multiple"
                        allowClear
                        placeholder='用户组成员'
                        filterOption={false}
                    >
                        {users.map(d => <Select.Option key={d.id}
                                                       value={d.id}>{d.nickname}</Select.Option>)}
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    )
};

export default UserGroupModal;
