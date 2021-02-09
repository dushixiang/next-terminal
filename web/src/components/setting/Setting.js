import React, {Component} from 'react';
import {Button, Form, Input, Layout, PageHeader, Select, Switch, Tabs, Typography} from "antd";
import {itemRender} from '../../utils/utils'
import request from "../../common/request";
import {message} from "antd/es";
import Logout from "../user/Logout";

const {Content} = Layout;
const {Option} = Select;
const {TabPane} = Tabs;
const {Title} = Typography;

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
    labelCol: {span: 12},
    wrapperCol: {span: 12},
};

const formTailLayout = {
    labelCol: {span: 12},
    wrapperCol: {span: 12},
};

class Setting extends Component {

    state = {
        properties: {}
    }

    settingFormRef1 = React.createRef();
    settingFormRef2 = React.createRef();
    settingFormRef3 = React.createRef();

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
        String.prototype.bool = function () {
            return (/^true$/i).test(this);
        };

        let result = await request.get('/properties');
        if (result['code'] === 1) {
            let properties = result['data'];

            for (let key in properties) {
                if(!properties.hasOwnProperty(key)){
                    continue;
                }
                if(key.startsWith('enable') || key.startsWith("disable")){
                    properties[key] = properties[key].bool();
                }
            }
            console.log(properties)
            this.setState({
                properties: properties
            })

            if (this.settingFormRef1.current) {
                this.settingFormRef1.current.setFieldsValue(properties)
            }

            if (this.settingFormRef2.current) {
                this.settingFormRef2.current.setFieldsValue(properties)
            }

            if (this.settingFormRef3.current) {
                this.settingFormRef3.current.setFieldsValue(properties)
            }
        } else {
            message.error(result['message']);
        }
    }

    handleOnTabChange = () => {
        this.getProperties()
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
                    extra={[
                        <Logout key='logout'/>
                    ]}
                    subTitle="系统设置"
                >
                </PageHeader>

                <Content className="site-layout-background page-content">

                    <Tabs tabPosition={'left'} onChange={this.handleOnTabChange} tabBarStyle={{width: 150}}>

                        <TabPane tab="RDP配置" key="1">
                            <Form ref={this.settingFormRef1} name="password" onFinish={this.changeProperties}
                                  layout="vertical">

                                <Title level={3}>RDP配置(远程桌面)</Title>

                                <Form.Item
                                    {...formItemLayout}
                                    name="enable-drive"
                                    label="启用设备映射"
                                    valuePropName="checked"
                                    rules={[
                                        {
                                            required: true,
                                        },
                                    ]}
                                >
                                    <Switch checkedChildren="开启" unCheckedChildren="关闭" onChange={(checked, event) => {
                                        this.setState({
                                            properties: {
                                                ...this.state.properties,
                                                'enable-drive': checked,
                                            }
                                        })
                                    }}/>
                                </Form.Item>
                                {
                                    this.state.properties['enable-drive'] === true ?
                                        <>
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
                                        </> : null
                                }

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

                                <Form.Item {...formTailLayout}>
                                    <Button type="primary" htmlType="submit">
                                        更新
                                    </Button>
                                </Form.Item>
                            </Form>
                        </TabPane>
                        <TabPane tab="SSH配置" key="2">
                            <Form ref={this.settingFormRef2} name="password" onFinish={this.changeProperties}
                                  layout="vertical">

                                <Title level={3}>SSH配置</Title>

                                <Form.Item
                                    {...formItemLayout}
                                    name="color-scheme"
                                    label="配色方案"
                                    rules={[
                                        {
                                            required: true,
                                            message: '配色方案',
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

                                <Form.Item {...formTailLayout}>
                                    <Button type="primary" htmlType="submit">
                                        更新
                                    </Button>
                                </Form.Item>
                            </Form>
                        </TabPane>
                        <TabPane tab="其他配置" key="3">
                            <Title level={3}>Guacd 服务配置</Title>
                            <Form ref={this.settingFormRef3} name="password" onFinish={this.changeProperties}
                                  layout="vertical">
                                <Form.Item
                                    {...formItemLayout}
                                    name="host"
                                    label="Guacd监听地址"
                                    rules={[
                                        {
                                            required: true,
                                            message: 'Guacd监听地址',
                                        },
                                    ]}
                                >
                                    <Input type='text' placeholder="请输入Guacd监听地址"/>
                                </Form.Item>

                                <Form.Item
                                    {...formItemLayout}
                                    name="port"
                                    label="Guacd监听端口"
                                    rules={[
                                        {
                                            required: true,
                                            message: 'Guacd监听端口',
                                            min: 1,
                                            max: 65535
                                        },
                                    ]}
                                >
                                    <Input type='number' placeholder="请输入Guacd监听端口"/>
                                </Form.Item>

                                <Form.Item
                                    {...formItemLayout}
                                    name="enable-recording"
                                    label="开启录屏"
                                    valuePropName="checked"
                                    rules={[
                                        {
                                            required: true,
                                        },
                                    ]}
                                >
                                    <Switch checkedChildren="开启" unCheckedChildren="关闭" onChange={(checked, event) => {
                                        this.setState({
                                            properties: {
                                                ...this.state.properties,
                                                'enable-recording': checked,
                                            }
                                        })
                                    }}/>
                                </Form.Item>
                                {
                                    this.state.properties['enable-recording'] === true ?
                                        <>

                                            <Form.Item
                                                {...formItemLayout}
                                                name="recording-path"
                                                label="录屏存放路径"
                                                rules={[
                                                    {
                                                        required: true,
                                                        message: '请输入录屏存放路径',
                                                    },
                                                ]}
                                            >
                                                <Input type='text' placeholder="请输入录屏存放路径"/>
                                            </Form.Item>
                                        </> : null
                                }

                                <Form.Item {...formTailLayout}>
                                    <Button type="primary" htmlType="submit">
                                        更新
                                    </Button>
                                </Form.Item>
                            </Form>
                        </TabPane>
                    </Tabs>


                </Content>
            </>
        );
    }
}

export default Setting;
