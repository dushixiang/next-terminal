import React from 'react';
import {Form, Input, Modal} from "antd/lib/index";

const {TextArea} = Input;

// 子级页面
// Ant form create 表单内置方法

const DynamicCommandModal = ({title, visible, handleOk, handleCancel, confirmLoading, model}) => {

    const [form] = Form.useForm();

    const formItemLayout = {
        labelCol: {span: 6},
        wrapperCol: {span: 18},
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

                <Form.Item label="指令名称" name='name' rules={[{required: true, message: '请输入指令名称'}]}>
                    <Input placeholder="请输入指令名称"/>
                </Form.Item>

                <Form.Item label="指令内容" name='content' rules={[{required: true, message: '请输入指令内容'}]}>
                    <TextArea autoSize={{minRows: 5, maxRows: 10}} placeholder="一行一个指令"/>
                </Form.Item>

            </Form>
        </Modal>
    )
};

export default DynamicCommandModal;
