import React, {useState} from 'react';
import {Form, Input, Modal, Radio, Select, Spin} from "antd";
import jobApi from "../../api/job";
import assetApi from "../../api/asset";
import {useQuery} from "react-query";
import strings from "../../utils/strings";

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

    useQuery('getJobById', () => jobApi.getById(id), {
        enabled: visible && strings.hasText(id),
        onSuccess: data => {
            if (data['func'] === 'shell-job') {
                try {
                    data['shell'] = JSON.parse(data['metadata'])['shell'];
                } catch (e) {
                    data['shell'] = '';
                }
            }

            if (data.resourceIds) {
                data.resourceIds = data.resourceIds.split(',');
            }
            form.setFieldsValue(data);
            setMode(data['mode']);
            setFunc(data['func']);
        },
    });

    let resQuery = useQuery(`resQuery`, () => assetApi.GetAll('ssh'));

    let resOptions = resQuery.data?.map(item => {
        return {
            label: item.name,
            value: item.id
        }
    });

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
                        console.log(values)
                        if (values['resourceIds']) {
                            values['resourceIds'] = values['resourceIds'].join(',');
                        }
                        form.resetFields();
                        handleOk(values);
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

            <Form form={form} {...formItemLayout}
                  initialValues={
                      {
                          func: 'shell-job',
                          mode: 'all',
                      }
                  }>
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
                        <Form.Item label="Shell脚本" name='shell'
                                   rules={[{required: true, message: '请输入Shell脚本'}]}>
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
                        <Radio value={'self'}>本机</Radio>
                    </Radio.Group>
                </Form.Item>

                {
                    mode === 'custom' &&
                    <Spin tip='加载中...' spinning={resQuery.isLoading}>
                        <Form.Item label="已选择资产" name='resourceIds' rules={[{required: true}]}>
                            <Select
                                mode="multiple"
                                allowClear
                                placeholder="请选择资产"
                                options={resOptions}
                            >
                            </Select>
                        </Form.Item>
                    </Spin>
                }
            </Form>
        </Modal>
    )
};

export default JobModal;
