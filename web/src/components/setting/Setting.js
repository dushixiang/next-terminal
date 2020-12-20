import React, {Component} from 'react';
import {Layout, PageHeader, Switch, Select} from "antd";
import {itemRender} from '../../utils/utils'
import {Form, Input, Button, Checkbox} from "antd";
import request from "../../common/request";
import {message} from "antd/es";

const {Content} = Layout;
const {Option} = Select;

const routes = [
    {
        path: '',
        breadcrumbName: '首页',
    },
    {
        path: 'setting',
        breadcrumbName: '系统设置',
    }
];

const formItemLayout = {
    labelCol: {span: 3},
    wrapperCol: {span: 9},
};

const formTailLayout = {
    labelCol: {span: 3},
    wrapperCol: {span: 9, offset: 3},
};

class Setting extends Component {

    state = {}

    settingFormRef = React.createRef();

    componentDidMount() {
        this.getProperties();
    }

    changeProperties = async (values) => {
        let result = await request.put('/properties', values);
        if (result.code === 1) {
            message.success('修改成功');
        } else {
            message.error(result.message);
        }
    }

    getProperties = async () => {

        // eslint-disable-next-line no-extend-native
        String.prototype.bool = function() {
            return (/^true$/i).test(this);
        };

        let result = await request.get('/properties');
        if (result.code === 1) {
            let properties = {}

            for (let i = 0; i < result.data.length; i++) {
                let item = result.data[i];
                if (item['name'].startsWith('enable') ||
                        item['name'].startsWith('disable')) {
                    properties[item['name']] = item['value'].bool()
                }else {
                    properties[item['name']] = item['value']
                }
            }
            this.settingFormRef.current.setFieldsValue(properties)

        } else {
            message.error(result.message);
        }
    }

    render() {
        return (
                <>
                    <PageHeader
                            className="site-page-header-ghost-wrapper page-herder"
                            title="系统设置"
                            breadcrumb={{
                                routes: routes,
                                itemRender: itemRender
                            }}
                            subTitle="系统设置"
                    >
                    </PageHeader>

                    <Content className="site-layout-background page-content">

                        <Form ref={this.settingFormRef} name="password" onFinish={this.changeProperties}>
                            <h3>Guacd 服务配置</h3>

                            <Form.Item
                                    {...formItemLayout}
                                    name="host"
                                    label="监听地址"
                                    rules={[
                                        {
                                            required: true,
                                            message: '监听地址',
                                        },
                                    ]}
                            >
                                <Input type='text' placeholder="请输入监听地址"/>
                            </Form.Item>

                            <Form.Item
                                    {...formItemLayout}
                                    name="port"
                                    label="监听端口"
                                    rules={[
                                        {
                                            required: true,
                                            message: '监听端口',
                                            min: 1,
                                            max: 65535
                                        },
                                    ]}
                            >
                                <Input type='number' placeholder="请输入监听端口"/>
                            </Form.Item>


                            <h3>远程桌面（RDP）配置</h3>

                            <Form.Item
                                    {...formItemLayout}
                                    name="enable-drive"
                                    label="启用设备映射"
                                    valuePropName="checked"
                            >
                                <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                            </Form.Item>

                            <Form.Item
                                    {...formItemLayout}
                                    name="drive-name"
                                    label="设备名称"
                                    rules={[
                                        {
                                            required: true,
                                            message: '请输入设备名称',
                                        },
                                    ]}
                            >
                                <Input type='text' placeholder="请输入设备名称"/>
                            </Form.Item>

                            <Form.Item
                                    {...formItemLayout}
                                    name="drive-path"
                                    label="设备路径"
                                    rules={[
                                        {
                                            required: true,
                                            message: '请输入设备路径',
                                        },
                                    ]}
                            >
                                <Input type='text' placeholder="请输入设备路径"/>
                            </Form.Item>

                            <Form.Item
                                    {...formItemLayout}
                                    name="enable-wallpaper"
                                    label="启用桌面墙纸"
                                    valuePropName="checked"
                            >
                                <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                            </Form.Item>

                            <Form.Item
                                    {...formItemLayout}
                                    name="enable-theming"
                                    label="启用桌面主题"
                                    valuePropName="checked"
                            >
                                <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                            </Form.Item>

                            <Form.Item
                                    {...formItemLayout}
                                    name="enable-font-smoothing"
                                    label="启用字体平滑（ClearType）"
                                    valuePropName="checked"
                            >
                                <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                            </Form.Item>
                            <Form.Item
                                    {...formItemLayout}
                                    name="enable-full-window-drag"
                                    label="启用全窗口拖拽"
                                    valuePropName="checked"
                            >
                                <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                            </Form.Item>
                            <Form.Item
                                    {...formItemLayout}
                                    name="enable-desktop-composition"
                                    label="启用桌面合成效果（Aero）"
                                    valuePropName="checked"
                            >
                                <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                            </Form.Item>
                            <Form.Item
                                    {...formItemLayout}
                                    name="enable-menu-animations"
                                    label="启用菜单动画"
                                    valuePropName="checked"
                            >
                                <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                            </Form.Item>
                            <Form.Item
                                    {...formItemLayout}
                                    name="disable-bitmap-caching"
                                    label="禁用位图缓存"
                                    valuePropName="checked"
                            >
                                <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                            </Form.Item>
                            <Form.Item
                                    {...formItemLayout}
                                    name="disable-offscreen-caching"
                                    label="禁用离屏缓存"
                                    valuePropName="checked"
                            >
                                <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                            </Form.Item>

                            <Form.Item
                                    {...formItemLayout}
                                    name="disable-glyph-caching"
                                    label="禁用字形缓存"
                                    valuePropName="checked"
                            >
                                <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                            </Form.Item>

                            <h3>SSH配置</h3>

                            <Form.Item
                                    {...formItemLayout}
                                    name="font-name"
                                    label="字体名称"
                                    rules={[
                                        {
                                            required: true,
                                            message: '字体名称',
                                        },
                                    ]}
                            >
                                <Input type='text' placeholder="请输入字体名称"/>
                            </Form.Item>

                            <Form.Item
                                    {...formItemLayout}
                                    name="font-size"
                                    label="字体大小"
                                    rules={[
                                        {
                                            required: true,
                                            message: '字体大小',
                                        },
                                    ]}
                            >
                                <Input type='number' placeholder="请输入字体大小"/>
                            </Form.Item>

                            <Form.Item
                                    {...formItemLayout}
                                    name="color-scheme"
                                    label="颜色主题"
                                    rules={[
                                        {
                                            required: true,
                                            message: '颜色主题',
                                        },
                                    ]}
                                    initialValue="gray-black"
                            >
                                <Select style={{width: 120}} onChange={null}>
                                    <Option value="gray-black">黑底灰字</Option>
                                    <Option value="green-black">黑底绿字</Option>
                                    <Option value="white-black">黑底白字</Option>
                                    <Option value="black-white">白底黑字</Option>
                                </Select>
                            </Form.Item>

                            <Form.Item
                                    {...formItemLayout}
                                    name="enable-sftp"
                                    label="启用SFTP"
                                    valuePropName="checked"
                            >
                                <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
                            </Form.Item>

                            <Form.Item {...formTailLayout}>
                                <Button type="primary" htmlType="submit">
                                    提交
                                </Button>
                            </Form.Item>
                        </Form>

                    </Content>
                </>
        );
    }
}

export default Setting;
