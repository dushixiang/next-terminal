import React, {useEffect, useState} from 'react';
import {Form, Input, Modal, Radio, Select, Spin} from "antd/lib/index";
import TextArea from "antd/es/input/TextArea";
import request from "../../common/request";
import {message} from "antd";

const JobModal = ({title, visible, handleOk, handleCancel, confirmLoading, model}) => {

    const [form] = Form.useForm();
    if (model.func === undefined) {
        model.func = 'shell-job';
    }

    if (model.mode === undefined) {
        model.mode = 'all';
    }

    let [func, setFunc] = useState(model.func);
    let [mode, setMode] = useState(model.mode);
    let [resources, setResources] = useState([]);
    useEffect(() => {
        const fetchData = async () => {
            setResourcesLoading(true);
            let result = await request.get('/assets?protocol=ssh');
            if (result['code'] === 1) {
                setResources(result['data']);
            } else {
                message.error(result['message'], 10);
            }
            setResourcesLoading(false);
        };

        fetchData();

    }, []);


    let [resourcesLoading, setResourcesLoading] = useState(false);

    const formItemLayout = {
        labelCol: {span: 6},
        wrapperCol: {span: 14},
    };

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
