import React from 'react';
import {Form, Input, Modal, Radio, Select} from "antd/lib/index";

const JobModal = ({title, visible, handleOk, handleCancel, confirmLoading, model}) => {

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

                <Form.Item label="任务类型" name='func' rules={[{required: true, message: '请选择任务类型'}]}>
                    <Select onChange={(value) => {

                    }}>
                        <Select.Option value="shell">Shell脚本</Select.Option>
                        <Select.Option value="check-asset-status-job">资产状态检测</Select.Option>
                    </Select>
                </Form.Item>

                <Form.Item label="任务名称" name='name' rules={[{required: true, message: '请输入任务名称'}]}>
                    <Input autoComplete="off" placeholder="请输入任务名称"/>
                </Form.Item>

                <Form.Item label="cron表达式" name='cron' rules={[{required: true, message: '请输入cron表达式'}]}>
                    <Input placeholder="请输入cron表达式"/>
                </Form.Item>

            </Form>
        </Modal>
    )
};

export default JobModal;
