import React from 'react';
import {Collapse, Form, Input, Modal, Select, Typography} from "antd/lib/index";

const {Option} = Select;
const {Panel} = Collapse;
const {Text} = Typography;

const AssetTelnetAttributeModal = function ({handleOk, handleCancel, confirmLoading, attributes}) {

    const [form] = Form.useForm();

    const formItemLayout = {
        labelCol: {span: 8},
        wrapperCol: {span: 14},
    };

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

            <Form form={form} {...formItemLayout} initialValues={attributes}>
                <Collapse defaultActiveKey={['认证']} ghost>
                    <Panel header={<Text strong>认证</Text>} key="认证">
                        <Form.Item
                            name="username-regex"
                            label="用户名正则表达式"
                        >
                            <Input type='text' placeholder=""/>
                        </Form.Item>
                        <Form.Item
                            name="password-regex"
                            label="密码正则表达式"
                        >
                            <Input type='text' placeholder=""/>
                        </Form.Item>
                        <Form.Item
                            name="login-success-regex"
                            label="登录成功正则表达式"
                        >
                            <Input type='text' placeholder=""/>
                        </Form.Item>
                        <Form.Item
                            name="login-failure-regex"
                            label="登录失败正则表达式"
                        >
                            <Input type='text' placeholder=""/>
                        </Form.Item>
                    </Panel>
                    <Panel header={<Text strong>显示设置</Text>} key="显示设置">
                        <Form.Item
                            name="color-scheme"
                            label="配色方案"
                            initialValue=""
                        >
                            <Select onChange={null}>
                                <Option value="">默认</Option>
                                <Option value="gray-black">黑底灰字</Option>
                                <Option value="green-black">黑底绿字</Option>
                                <Option value="white-black">黑底白字</Option>
                                <Option value="black-white">白底黑字</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="font-name"
                            label="字体名称"
                        >
                            <Input type='text' placeholder="为空时使用系统默认字体"/>
                        </Form.Item>

                        <Form.Item
                            name="font-size"
                            label="字体大小"
                        >
                            <Input type='number' placeholder="为空时使用系统默认字体大小" min={8} max={96}/>
                        </Form.Item>
                    </Panel>
                    <Panel header={<Text strong>控制终端行为</Text>} key="控制终端行为">
                        <Form.Item
                            name="backspace"
                            label="退格键映射"
                            initialValue=""
                        >
                            <Select onChange={null}>
                                <Option value="">默认</Option>
                                <Option value="string:127">删除键(Ctrl-?)</Option>
                                <Option value="string:8">退格键(Ctrl-H)</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="terminal-type"
                            label="终端类型"
                            initialValue=""
                        >
                            <Select onChange={null}>
                                <Option value="">默认</Option>
                                <Option value="ansi">ansi</Option>
                                <Option value="linux">linux</Option>
                                <Option value="vt100">vt100</Option>
                                <Option value="vt220">vt220</Option>
                                <Option value="xterm">xterm</Option>
                                <Option value="xterm-256color">xterm-256color</Option>
                            </Select>
                        </Form.Item>
                    </Panel>
                </Collapse>

            </Form>
        </Modal>
    )
}

export default AssetTelnetAttributeModal;
