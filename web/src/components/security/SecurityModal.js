import React, {useEffect} from 'react';
import {Form, Input, InputNumber, Modal, Radio} from "antd";
import securityApi from "../../api/security";

const formItemLayout = {
    labelCol: {span: 6},
    wrapperCol: {span: 14},
};

const SecurityModal = ({
                           visible,
                           handleOk,
                           handleCancel,
                           confirmLoading,
                           id,
                       }) => {

    const [form] = Form.useForm();

    useEffect(() => {

        const getItem = async () => {
            let data = await securityApi.getById(id);
            if (data) {
                form.setFieldsValue(data);
            }
        }
        if (visible && id) {
            getItem();
        } else {
            form.setFieldsValue({
                priority: 50,
            });
        }
    }, [visible])

    return (
        <Modal
            title={id ? '更新访问规则' : '新建访问规则'}
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

                <Form.Item label="IP地址" name='ip' rules={[{required: true, message: '请输入IP地址'}]} extra='格式为逗号分隔的字符串, 0.0.0.0/0 匹配所有。例如: 192.168.0.1, 192.168.1.0/24, 192.168.2.0-192.168.2.20'>
                    <Input autoComplete="off" placeholder="请输入"/>
                </Form.Item>

                <Form.Item label="规则" name='rule' rules={[{required: true, message: '请选择规则'}]}>
                    <Radio.Group onChange={async (e) => {

                    }}>
                        <Radio value={'allow'}>允许</Radio>
                        <Radio value={'reject'}>拒绝</Radio>
                    </Radio.Group>
                </Form.Item>

                <Form.Item label="优先级" name='priority' rules={[{required: true, message: '请输入优先级'}]} extra='优先级可选范围为 1-100 (数值越小越优先)'>
                    <InputNumber min={1} max={100}/>
                </Form.Item>

            </Form>
        </Modal>
    )
};

export default SecurityModal;
