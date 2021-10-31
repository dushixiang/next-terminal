import React from 'react';
import {Form, Input, Modal, Switch} from "antd/lib/index";

const formItemLayout = {
    labelCol: {span: 6},
    wrapperCol: {span: 14},
};

const StrategyModal = ({title, visible, handleOk, handleCancel, confirmLoading, model}) => {

    const [form] = Form.useForm();

    if (model === undefined) {
        model = {
            'upload': false,
            'download': false,
            'delete': false,
            'rename': false,
            'edit': false,
        };
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
                    <Input autoComplete="off" placeholder="授权策略名称"/>
                </Form.Item>

                <Form.Item label="上传" name='upload' rules={[{required: true}]} valuePropName="checked">
                    <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                </Form.Item>

                <Form.Item label="下载" name='download' rules={[{required: true}]} valuePropName="checked">
                    <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                </Form.Item>

                <Form.Item label="编辑" name='edit' rules={[{required: true}]} valuePropName="checked" tooltip={'编辑需要先开启下载'}>
                    <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                </Form.Item>

                <Form.Item label="删除" name='delete' rules={[{required: true}]} valuePropName="checked">
                    <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                </Form.Item>

                <Form.Item label="重命名" name='rename' rules={[{required: true}]} valuePropName="checked">
                    <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                </Form.Item>
            </Form>
        </Modal>
    )
};

export default StrategyModal;
