import React, {useEffect} from 'react';
import {Form, Input, Modal, Switch} from "antd";
import strategyApi from "../../api/strategy";

const api = strategyApi;

const formItemLayout = {
    labelCol: {span: 6},
    wrapperCol: {span: 14},
};

const StrategyModal = ({visible, handleOk, handleCancel, confirmLoading, id}) => {

    const [form] = Form.useForm();

    useEffect(() => {

        const getItem = async () => {
            let data = await api.getById(id);
            if (data) {
                form.setFieldsValue(data);
            }
        }
        if (visible && id) {
            getItem();
        } else {
            form.setFieldsValue({
                upload: false,
                download: false,
                edit: false,
                delete: false,
                rename: false,
                copy: false,
                paste: false,
            });
        }
    }, [visible]);

    return (
        <Modal
            title={id ? '更新授权策略' : '新建授权策略'}
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

                <Form.Item label="名称" name='name' rules={[{required: true, message: '请输入名称'}]}>
                    <Input autoComplete="off" placeholder="授权策略名称"/>
                </Form.Item>

                <Form.Item label="上传" name='upload' rules={[{required: true}]} valuePropName="checked">
                    <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                </Form.Item>

                <Form.Item label="下载" name='download' rules={[{required: true}]} valuePropName="checked">
                    <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                </Form.Item>

                <Form.Item label="编辑" name='edit' rules={[{required: true}]} valuePropName="checked"
                           tooltip={'编辑需要先开启下载'}>
                    <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                </Form.Item>

                <Form.Item label="删除" name='delete' rules={[{required: true}]} valuePropName="checked">
                    <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                </Form.Item>

                <Form.Item label="重命名" name='rename' rules={[{required: true}]} valuePropName="checked">
                    <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                </Form.Item>

                <Form.Item label="复制" name='copy' rules={[{required: true}]} valuePropName="checked">
                    <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                </Form.Item>

                <Form.Item label="粘贴" name='paste' rules={[{required: true}]} valuePropName="checked">
                    <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                </Form.Item>
            </Form>
        </Modal>
    )
};

export default StrategyModal;
