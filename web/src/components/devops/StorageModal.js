import React, {useEffect} from 'react';
import {Form, Input, Modal, Switch} from "antd";
import storageApi from "../../api/storage";

const formItemLayout = {
    labelCol: {span: 6},
    wrapperCol: {span: 14},
};

const StorageModal = ({
                          visible,
                          handleOk,
                          handleCancel,
                          confirmLoading,
                          id,
                      }) => {

    const [form] = Form.useForm();


    useEffect(() => {

        const getItem = async () => {
            let data = await storageApi.getById(id);
            if (data) {
                form.setFieldsValue(data);
            }
        }
        if (visible && id) {
            getItem();
        } else {
            form.setFieldsValue({
                isShare: false,
            });
        }
    }, [visible])

    return (
        <Modal
            title={id ? '更新磁盘空间' : '新建磁盘空间'}
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
                    <Input autoComplete="off" placeholder="网盘的名称"/>
                </Form.Item>

                <Form.Item label="是否共享" name='isShare' rules={[{required: true, message: '请选择是否共享'}]}
                           valuePropName="checked">
                    <Switch checkedChildren="是" unCheckedChildren="否"/>
                </Form.Item>

                <Form.Item label="大小限制" name='limitSize' rules={[{required: true, message: '请输入大小限制'}]}
                           tooltip='无限制请填写-1'>
                    <Input type={'number'} min={-1} suffix="MB"/>
                </Form.Item>

            </Form>
        </Modal>
    )
};

export default StorageModal;
