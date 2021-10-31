import React from 'react';
import {Form, Input, Modal, Switch} from "antd/lib/index";

const formItemLayout = {
    labelCol: {span: 6},
    wrapperCol: {span: 14},
};

const StorageModal = ({title, visible, handleOk, handleCancel, confirmLoading, model}) => {

    const [form] = Form.useForm();
    if(!model){
        model = {
            isShare: false
        }
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

                <Form.Item label="名称" name='name' rules={[{required: true, message: '请输入名称'}]}>
                    <Input autoComplete="off" placeholder="网盘的名称"/>
                </Form.Item>

                <Form.Item label="是否共享" name='isShare' rules={[{required: true, message: '请选择是否共享'}]} valuePropName="checked">
                    <Switch checkedChildren="是" unCheckedChildren="否" />
                </Form.Item>

                <Form.Item label="大小限制" name='limitSize' rules={[{required: true, message: '请输入大小限制'}]}>
                    <Input type={'number'} min={-1} suffix="MB"/>
                </Form.Item>

            </Form>
        </Modal>
    )
};

export default StorageModal;
