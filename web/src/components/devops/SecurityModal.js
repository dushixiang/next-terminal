import React from 'react';
import {Form, Input, InputNumber, Modal, Radio, Tooltip} from "antd/lib/index";
import {ExclamationCircleOutlined} from "@ant-design/icons";

const formItemLayout = {
    labelCol: {span: 6},
    wrapperCol: {span: 14},
};

const SecurityModal = ({title, visible, handleOk, handleCancel, confirmLoading, model}) => {

    const [form] = Form.useForm();

    if (model['priority'] === undefined) {
        model['priority'] = 0;
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

                <Form.Item label="IP地址" name='ip' rules={[{required: true, message: '请输入IP地址'}]}>
                    <Input autoComplete="off" placeholder="支持单个IP，CIDR或使用-连接的两个IP"/>
                </Form.Item>

                <Form.Item label="规则" name='rule' rules={[{required: true, message: '请选择规则'}]}>
                    <Radio.Group onChange={async (e) => {

                    }}>
                        <Radio value={'allow'}>允许</Radio>
                        <Radio value={'reject'}>拒绝</Radio>
                    </Radio.Group>
                </Form.Item>

                <Form.Item label={<Tooltip
                    title="数字越小代表优先级越高。">优先级&nbsp;
                    <ExclamationCircleOutlined/></Tooltip>} name='priority' rules={[{required: true, message: '请输入优先级'}]}>
                    <InputNumber min={0} max={100}/>
                </Form.Item>

            </Form>
        </Modal>
    )
};

export default SecurityModal;
