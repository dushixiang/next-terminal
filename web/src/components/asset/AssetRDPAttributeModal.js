import React from 'react';
import {Collapse, Form, Input, Modal, Switch, Tooltip, Typography} from "antd/lib/index";
import {ExclamationCircleOutlined} from "@ant-design/icons";

const {Text} = Typography;
const {Panel} = Collapse;
const formLayout = {
    labelCol: {span: 6},
    wrapperCol: {span: 14},
};
const formItemLayout = {
    labelCol: {span: 12},
    wrapperCol: {span: 12},
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

                <Collapse defaultActiveKey={['remote-app']} ghost>
                    <Panel header={<Text strong>Remote App</Text>} key="remote-app">
                        <Form.Item
                            name="remote-app"
                            label={<Tooltip title="指定在远程桌面上启动的RemoteApp。
如果您的远程桌面服务器支持该应用程序，则该应用程序(且仅该应用程序)对用户可见。

Windows需要对远程应用程序的名称使用特殊的符号。
远程应用程序的名称必须以两个竖条作为前缀。
例如，如果您已经在您的服务器上为notepad.exe创建了一个远程应用程序，并将其命名为“notepad”，则您将该参数设置为:“||notepad”。">
                                程序&nbsp;<ExclamationCircleOutlined/>
                            </Tooltip>}
                        >
                            <Input type='text' placeholder="remote app"/>
                        </Form.Item>

                        <Form.Item
                            name="remote-app-dir"
                            label={<Tooltip title="remote app的工作目录，如果未配置remote app，此参数无效。">工作目录&nbsp;
                                <ExclamationCircleOutlined/></Tooltip>}
                        >
                            <Input type='text' placeholder="remote app的工作目录"/>
                        </Form.Item>

                        <Form.Item
                            name="remote-app-args"
                            label={<Tooltip title="remote app的命令行参数，如果未配置remote app，此参数无效。">参数&nbsp;
                                <ExclamationCircleOutlined/></Tooltip>}
                        >
                            <Input type='text' placeholder="remote app的命令行参数"/>
                        </Form.Item>
                    </Panel>
                    <Panel header={<Text strong>性能</Text>} key="2">
                        <Form.Item
                            {...formItemLayout}
                            name="enable-wallpaper"
                            label="启用桌面墙纸"
                            valuePropName="checked"
                            rules={[
                                {
                                    required: true,
                                },
                            ]}
                        >
                            <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                        </Form.Item>

                        <Form.Item
                            {...formItemLayout}
                            name="enable-theming"
                            label="启用桌面主题"
                            valuePropName="checked"
                            rules={[
                                {
                                    required: true,
                                },
                            ]}
                        >
                            <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                        </Form.Item>

                        <Form.Item
                            {...formItemLayout}
                            name="enable-font-smoothing"
                            label="启用字体平滑（ClearType）"
                            valuePropName="checked"
                            rules={[
                                {
                                    required: true,
                                },
                            ]}
                        >
                            <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                        </Form.Item>
                        <Form.Item
                            {...formItemLayout}
                            name="enable-full-window-drag"
                            label="启用全窗口拖拽"
                            valuePropName="checked"
                            rules={[
                                {
                                    required: true,
                                },
                            ]}
                        >
                            <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                        </Form.Item>
                        <Form.Item
                            {...formItemLayout}
                            name="enable-desktop-composition"
                            label="启用桌面合成效果（Aero）"
                            valuePropName="checked"
                            rules={[
                                {
                                    required: true,
                                },
                            ]}
                        >
                            <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                        </Form.Item>
                        <Form.Item
                            {...formItemLayout}
                            name="enable-menu-animations"
                            label="启用菜单动画"
                            valuePropName="checked"
                            rules={[
                                {
                                    required: true,
                                },
                            ]}
                        >
                            <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                        </Form.Item>
                        <Form.Item
                            {...formItemLayout}
                            name="disable-bitmap-caching"
                            label="禁用位图缓存"
                            valuePropName="checked"
                            rules={[
                                {
                                    required: true,
                                },
                            ]}
                        >
                            <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                        </Form.Item>
                        <Form.Item
                            {...formItemLayout}
                            name="disable-offscreen-caching"
                            label="禁用离屏缓存"
                            valuePropName="checked"
                            rules={[
                                {
                                    required: true,
                                },
                            ]}
                        >
                            <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                        </Form.Item>

                        <Form.Item
                            {...formItemLayout}
                            name="disable-glyph-caching"
                            label="禁用字形缓存"
                            valuePropName="checked"
                            rules={[
                                {
                                    required: true,
                                },
                            ]}
                        >
                            <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                        </Form.Item>
                    </Panel>
                </Collapse>
            </Form>
        </Modal>
    )
}

export default AssetRDPAttributeModal;
