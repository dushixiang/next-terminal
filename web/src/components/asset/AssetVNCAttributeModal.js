import React from 'react';
import {Collapse, Form, Input, Modal, Select, Switch, Tooltip, Typography} from "antd/lib/index";
import {ExclamationCircleOutlined} from "@ant-design/icons";

const {Text} = Typography;

const {Option} = Select;
const {Panel} = Collapse;
const formLayout = {
    labelCol: {span: 6},
    wrapperCol: {span: 14},
};

const AssetRDPAttributeModal = function ({handleOk, handleCancel, confirmLoading, attributes}) {

    const [form] = Form.useForm();

    return (

        <Modal
            title={'属性'}
            visible={true}
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

            <Form form={form} {...formLayout} initialValues={attributes}>

                <Collapse defaultActiveKey={['显示设置']} ghost>
                    <Panel header={<Text strong>显示设置</Text>} key="显示设置">
                        <Form.Item
                            name="color-depth"
                            label="色彩深度"
                            initialValue=""
                        >
                            <Select onChange={null}>
                                <Option value="">默认</Option>
                                <Option value="string:16">低色（16位）</Option>
                                <Option value="string:24">真彩（24位）</Option>
                                <Option value="string:32">真彩（32位）</Option>
                                <Option value="string:8">256色</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="cursor"
                            label="光标"
                            initialValue=""
                        >
                            <Select onChange={null}>
                                <Option value="">默认</Option>
                                <Option value="string:local">本地</Option>
                                <Option value="string:remote">远程</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="swap-red-blue"
                            label="交换红蓝成分"
                        >
                            <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                        </Form.Item>
                    </Panel>
                    <Panel header={<Text strong>VNC中继</Text>} key="2">
                        <Form.Item label={<Tooltip title="连接到VNC代理（例如UltraVNC Repeater）时要请求的目标主机。">目标主机&nbsp;
                            <ExclamationCircleOutlined/></Tooltip>}
                                   name='dest-host'>
                            <Input placeholder="目标主机"/>
                        </Form.Item>
                        <Form.Item label={<Tooltip title="连接到VNC代理（例如UltraVNC Repeater）时要请求的目标端口。">目标端口&nbsp;
                            <ExclamationCircleOutlined/></Tooltip>}
                                   name='dest-port'>
                            <Input type='number' min={1} max={65535}
                                   placeholder='目标端口'/>
                        </Form.Item>
                    </Panel>
                </Collapse>
            </Form>
        </Modal>
    )
}

export default AssetRDPAttributeModal;
