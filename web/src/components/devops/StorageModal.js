import React, {useState} from 'react';
import {Form, Input, InputNumber, Modal, Select, Switch} from "antd";
import storageApi from "../../api/storage";
import {renderSize} from "../../utils/utils";
import {useQuery} from "react-query";
import strings from "../../utils/strings";

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

    useQuery('getStorageById', () => storageApi.getById(id), {
        enabled: visible && strings.hasText(id),
        onSuccess: data => {
            if (data['limitSize'] > 0) {
                let limitSize = renderSize(data['limitSize']);
                let ss = limitSize.split(' ');
                data['limitSize'] = parseInt(ss[0]);
                setUnit(ss[1]);
            } else {
                data['limitSize'] = -1;
            }
            form.setFieldsValue(data);
        },
    });

    let [unit, setUnit] = useState('MB');

    const selectAfter = (
        <Select value={unit} style={{width: 65}} onChange={(value) => {
            setUnit(value);
        }}>
            <Select.Option value="B">B</Select.Option>
            <Select.Option value="KB">KB</Select.Option>
            <Select.Option value="MB">MB</Select.Option>
            <Select.Option value="GB">GB</Select.Option>
            <Select.Option value="TB">TB</Select.Option>
            <Select.Option value="PB">PB</Select.Option>
            <Select.Option value="EB">EB</Select.Option>
            <Select.Option value="ZB">ZB</Select.Option>
            <Select.Option value="YB">YB</Select.Option>
        </Select>
    );

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
                        let limitSize = values['limitSize'];
                        switch (unit) {
                            case 'B':
                                break;
                            case 'KB':
                                limitSize = limitSize * 1024;
                                break;
                            case 'MB':
                                limitSize = limitSize * 1024 * 1024;
                                break;
                            case 'GB':
                                limitSize = limitSize * 1024 * 1024 * 1024;
                                break;
                            case 'TB':
                                limitSize = limitSize * 1024 * 1024 * 1024 * 1024 * 1024;
                                break;
                            case 'EB':
                                limitSize = limitSize * 1024 * 1024 * 1024 * 1024 * 1024 * 1024;
                                break;
                            case 'ZB':
                                limitSize = limitSize * 1024 * 1024 * 1024 * 1024 * 1024 * 1024 * 1024;
                                break;
                            case 'YB':
                                limitSize = limitSize * 1024 * 1024 * 1024 * 1024 * 1024 * 1024 * 1024 * 1024;
                                break;
                            default:
                                break;
                        }
                        values['limitSize'] = limitSize;
                        let ok = await handleOk(values);
                        if (ok) {
                            form.resetFields();
                        }
                    });
            }}
            onCancel={() => {
                form.resetFields();
                setUnit('MB');
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
                    <InputNumber min={-1} addonAfter={selectAfter} style={{width: 275}}/>
                </Form.Item>

            </Form>
        </Modal>
    )
};

export default StorageModal;
