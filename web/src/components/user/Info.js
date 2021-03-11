import React, {Component} from 'react';
import {Button, Card, Form, Image, Input, Layout, Modal, PageHeader, Result, Space} from "antd";
import {itemRender} from '../../utils/utils'
import request from "../../common/request";
import {message} from "antd/es";
import {ExclamationCircleOutlined, ReloadOutlined} from "@ant-design/icons";

const {Content} = Layout;
const {Meta} = Card;

const routes = [
    {
        path: '',
        breadcrumbName: '首页',
    },
    {
        path: 'info',
        breadcrumbName: '个人中心',
    }
];

const formItemLayout = {
    labelCol: {span: 3},
    wrapperCol: {span: 6},
};
const formTailLayout = {
    labelCol: {span: 3},
    wrapperCol: {span: 6, offset: 3},
};
const {confirm} = Modal;

class Info extends Component {

    state = {
        user: {
            enableTotp: false
        }
    }

    passwordFormRef = React.createRef();

    componentDidMount() {
        this.loadInfo();
    }

    loadInfo = async () => {
        let result = await request.get('/info');
        if (result['code'] === 1) {
            this.setState({
                user: result['data']
            })
            sessionStorage.setItem('user', JSON.stringify(result['data']));
        } else {
            message.error(result['message']);
        }
    }

    onNewPasswordChange(value) {
        this.setState({
            'newPassword': value.target.value
        })
    }

    onNewPassword2Change = (value) => {
        this.setState({
            ...this.validateNewPassword(value.target.value),
            'newPassword2': value.target.value
        })
    }

    validateNewPassword = (newPassword2) => {
        if (newPassword2 === this.state.newPassword) {
            return {
                validateStatus: 'success',
                errorMsg: null,
            };
        }
        return {
            validateStatus: 'error',
            errorMsg: '两次输入的密码不一致',
        };
    }

    changePassword = async (values) => {
        let result = await request.post('/change-password', values);
        if (result.code === 1) {
            message.success('密码修改成功，即将跳转至登录页面');
            window.location.href = '/#';
        } else {
            message.error(result.message);
        }
    }

    confirmTOTP = async (values) => {
        values['secret'] = this.state.secret
        let result = await request.post('/confirm-totp', values);
        if (result.code === 1) {
            message.success('TOTP启用成功');
            await this.loadInfo();
            this.setState({
                qr: "",
                secret: ""
            })
        } else {
            message.error(result.message);
        }
    }

    resetTOTP = async () => {
        let result = await request.get('/reload-totp');
        if (result.code === 1) {
            this.setState({
                qr: result.data.qr,
                secret: result.data.secret,
            })
        } else {
            message.error(result.message);
        }
    }

    render() {
        return (
            <>
                <PageHeader
                    className="site-page-header-ghost-wrapper"
                    title="个人中心"
                    breadcrumb={{
                        routes: routes,
                        itemRender: itemRender
                    }}

                    subTitle="个人中心"
                />

                <Content className="site-layout-background page-content">
                    <h1>修改密码</h1>
                    <Form ref={this.passwordFormRef} name="password" onFinish={this.changePassword}>
                        <Form.Item
                            {...formItemLayout}
                            name="oldPassword"
                            label="原始密码"
                            rules={[
                                {
                                    required: true,
                                    message: '原始密码',
                                },
                            ]}
                        >
                            <Input type='password' placeholder="请输入原始密码"/>
                        </Form.Item>
                        <Form.Item
                            {...formItemLayout}
                            name="newPassword"
                            label="新的密码"
                            rules={[
                                {
                                    required: true,
                                    message: '请输入新的密码',
                                },
                            ]}
                        >
                            <Input type='password' placeholder="新的密码"
                                   onChange={(value) => this.onNewPasswordChange(value)}/>
                        </Form.Item>
                        <Form.Item
                            {...formItemLayout}
                            name="newPassword2"
                            label="确认密码"
                            rules={[
                                {
                                    required: true,
                                    message: '请和上面输入新的密码保持一致',
                                },
                            ]}
                            validateStatus={this.state.validateStatus}
                            help={this.state.errorMsg || ''}
                        >
                            <Input type='password' placeholder="请和上面输入新的密码保持一致"
                                   onChange={(value) => this.onNewPassword2Change(value)}/>
                        </Form.Item>
                        <Form.Item {...formTailLayout}>
                            <Button type="primary" htmlType="submit">
                                提交
                            </Button>
                        </Form.Item>
                    </Form>
                </Content>
                <Content className="site-layout-background page-content">
                    <h1>双因素认证</h1>
                    <Form hidden={this.state.qr}>
                        <Form.Item>
                            {
                                this.state.user.enableTotp ?
                                    <Result
                                        status="success"
                                        title="您已成功开启双因素认证!"
                                        subTitle="多因素认证-MFA二次认证-登录身份鉴别,访问控制更安全。"
                                        extra={[
                                            <Button type="primary" key="console" danger onClick={() => {
                                                confirm({
                                                    title: '您确认要解除双因素认证吗？',
                                                    icon: <ExclamationCircleOutlined/>,
                                                    content: '解除之后可能存在系统账号被暴力破解的风险。',
                                                    okText: '确认',
                                                    okType: 'danger',
                                                    cancelText: '取消',
                                                    onOk: async () => {
                                                        let result = await request.post('/reset-totp');
                                                        if (result.code === 1) {
                                                            message.success('双因素认证解除成功');
                                                            await this.loadInfo();
                                                        } else {
                                                            message.error(result.message);
                                                        }
                                                    },
                                                    onCancel() {
                                                        console.log('Cancel');
                                                    },
                                                })
                                            }}>
                                                解除绑定
                                            </Button>,
                                            <Button key="re-bind" onClick={this.resetTOTP}>重新绑定</Button>,
                                        ]}
                                    /> :
                                    <Result
                                        status="warning"
                                        title="您还未开启双因素认证！"
                                        subTitle="系统账号存在被暴力破解的风险。"
                                        extra={
                                            <Button type="primary" key="bind" onClick={this.resetTOTP}>
                                                去开启
                                            </Button>
                                        }
                                    />
                            }

                        </Form.Item>
                    </Form>
                    <Form hidden={!this.state.qr} onFinish={this.confirmTOTP}>
                        <Form.Item {...formItemLayout} label="二维码">
                            <Space size={12}>

                                <Card
                                    hoverable
                                    style={{width: 280}}
                                    cover={<Image
                                        style={{margin: 40, marginBottom: 20}}
                                        width={200}
                                        src={"data:image/png;base64, " + this.state.qr}
                                    />
                                    }
                                >
                                    <Meta title="双因素认证二维码"
                                          description="有效期30秒，在扫描后请尽快输入。推荐使用Google Authenticator, Authy 或者 Microsoft Authenticator。"/>
                                </Card>

                                <Button
                                    type="primary"
                                    icon={<ReloadOutlined/>}
                                    onClick={this.resetTOTP}
                                >
                                    重新加载
                                </Button>
                            </Space>
                        </Form.Item>
                        <Form.Item
                            {...formItemLayout}
                            name="totp"
                            label="TOTP"
                            rules={[
                                {
                                    required: true,
                                    message: '请输入双因素认证APP中显示的授权码',
                                },
                            ]}
                        >
                            <Input placeholder="请输入双因素认证APP中显示的授权码"/>
                        </Form.Item>
                        <Form.Item {...formTailLayout}>
                            <Button type="primary" htmlType="submit">
                                确认
                            </Button>
                        </Form.Item>
                    </Form>
                </Content>
            </>
        );
    }
}

export default Info;
