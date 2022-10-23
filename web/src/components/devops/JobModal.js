import React, {useEffect, useState} from 'react';
import {Form, Input, Modal, Radio, Select, Spin} from "antd";
import jobApi from "../../api/job";
import assetApi from "../../api/asset";

const {TextArea} = Input;

const JobModal = ({
                      visible,
                      handleOk,
                      handleCancel,
                      confirmLoading,
                      id,
                  }) => {

    const [form] = Form.useForm();

    let [func, setFunc] = useState('shell-job');
    let [mode, setMode] = useState('all');
    let [resources, setResources] = useState([]);
    let [resourcesLoading, setResourcesLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setResourcesLoading(true);
            let result = await assetApi.GetAll('ssh');
            setResources(result);
            setResourcesLoading(false);
        };

        fetchData();

        const getItem = async () => {
            let data = await jobApi.getById(id);
            if (data) {
                form.setFieldsValue(data);
                setMode(data['mode']);
                setFunc(data['func']);
            }
        }

        if (visible && id) {
            getItem();
        } else {
            form.setFieldsValue({
                func: 'shell-job',
                mode: 'all',
            });
        }

    }, [visible]);

    const formItemLayout = {
        labelCol: {span: 6},
        wrapperCol: {span: 14},
    };

    return (
        <Modal
            title={id ? '更新计划任务' : '新建计划任务'}
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

                <Form.Item label="任务类型" name='func' rules={[{required: true, message: '请选择任务类型'}]}>
                    <Select onChange={(value) => {
                        setFunc(value);
                    }}>
                        <Select.Option value="shell-job">Shell脚本</Select.Option>
                        <Select.Option value="check-asset-status-job">资产状态检测</Select.Option>
                    </Select>
                </Form.Item>

                <Form.Item label="任务名称" name='name' rules={[{required: true, message: '请输入任务名称'}]}>
                    <Input autoComplete="off" placeholder="请输入任务名称"/>
                </Form.Item>

                {
                    func === 'shell-job' ?
                        <Form.Item label="Shell脚本" name='shell' rules={[{required: true, message: '请输入Shell脚本'}]}>
                            <TextArea autoSize={{minRows: 5, maxRows: 10}} placeholder="在此处填写Shell脚本内容"/>
                        </Form.Item> : undefined
                }

                <Form.Item label="cron表达式" name='cron' rules={[{required: true, message: '请输入cron表达式'}]}>
                    <Input placeholder="请输入cron表达式"/>
                </Form.Item>

                <Form.Item label="资产选择" name='mode' rules={[{required: true, message: '请选择资产'}]}>
                    <Radio.Group onChange={async (e) => {
                        setMode(e.target.value);
                    }}>
                        <Radio value={'all'}>全部资产</Radio>
                        <Radio value={'custom'}>自定义</Radio>
                    </Radio.Group>
                </Form.Item>

                {
                    mode === 'custom' ?
                        <Spin tip='加载中...' spinning={resourcesLoading}>
                            <Form.Item label="已选择资产" name='resourceIds' rules={[{required: true}]}>
                                <Select
                                    mode="multiple"
                                    allowClear
                                    placeholder="请选择资产"
                                >
                                    {
                                        resources.map(item => {
                                            return <Select.Option key={item['id']}>{item['name']}</Select.Option>
                                        })
                                    }
                                </Select>
                            </Form.Item>
                        </Spin>
                        : undefined
                }
            </Form>
        </Modal>
    )
};

export default JobModal;
