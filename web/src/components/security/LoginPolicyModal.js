import React, {useEffect, useState} from 'react';
import {Checkbox, Form, Input, InputNumber, Modal, Radio} from "antd";
import DragWeekTime from "../../dd/drag-weektime/DragWeekTime";
import loginPolicyApi from "../../api/login-policy";

const formItemLayout = {
    labelCol: {span: 4},
    wrapperCol: {span: 18},
};

let wkRef = React.createRef();

const LoginPolicyModal = ({
                              visible,
                              handleOk,
                              handleCancel,
                              confirmLoading,
                              id,
                              userId
                          }) => {

    const [form] = Form.useForm();

    useEffect(() => {

        const getItem = async () => {
            let data = await loginPolicyApi.getById(id);
            if (data) {
                form.setFieldsValue(data);
                wkRef.current.renderWeekTime(data.timePeriod);
            }
        }
        if (visible && id) {
            getItem();
        } else {
            form.setFieldsValue({
                ipGroup: '0.0.0.0/0',
                priority: 50,
                rule: 'reject',
                enabled: true
            });
        }
    }, [visible])

    return (
        <Modal
            title={id ? '更新登录策略' : '新建登录策略'}
            visible={visible}
            maskClosable={false}
            destroyOnClose={true}
            width={900}
            onOk={() => {
                form
                    .validateFields()
                    .then(async values => {
                        values['userId'] = userId;
                        let ok = await handleOk(values);
                        if (ok) {
                            form.resetFields();
                        }
                    });
            }}
            onCancel={() => {
                form.resetFields();
                wkRef.current.reset();
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

                <Form.Item label="名称" name='name' rules={[{required: true}]}>
                    <Input autoComplete="off" placeholder="请输入策略名称"/>
                </Form.Item>

                <Form.Item label="优先级" name='priority' rules={[{required: true}]} extra='优先级可选范围为 1-100 (数值越小越优先)'>
                    <InputNumber autoComplete="off" min={1} max={100}/>
                </Form.Item>

                <Form.Item label="IP地址" name='ipGroup' rules={[{required: true}]}
                           extra='格式为逗号分隔的字符串, 0.0.0.0/0 匹配所有。例如: 192.168.0.1, 192.168.1.0/24, 192.168.2.0-192.168.2.20'>
                    <Input autoComplete="off"/>
                </Form.Item>

                <Form.Item label="时段" name='timePeriod'>
                    <DragWeekTime onRef={wkRef}/>
                </Form.Item>

                <Form.Item label="规则" name='rule' rules={[{required: true, message: '请选择规则'}]}>
                    <Radio.Group>
                        <Radio value={'allow'}>允许</Radio>
                        <Radio value={'reject'}>拒绝</Radio>
                    </Radio.Group>
                </Form.Item>

                <Form.Item label="激活" name='enabled' valuePropName="checked" rules={[{required: true}]}>
                    <Checkbox/>
                </Form.Item>
            </Form>
        </Modal>
    )
};

export default LoginPolicyModal;
