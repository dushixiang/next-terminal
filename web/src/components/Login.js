import React, {Component} from 'react';
import {Button, Card, Checkbox, Form, Input, Modal, Typography} from "antd";
import './Login.css'
import request from "../common/request";
import {message} from "antd/es";
import {withRouter} from "react-router-dom";
import {LockOutlined, OneToOneOutlined, UserOutlined} from '@ant-design/icons';

const {Title} = Typography;

class LoginForm extends Component {

    formRef = React.createRef()

    state = {
        inLogin: false,
        height: window.innerHeight,
        width: window.innerWidth,
        loginAccount: undefined,
        totpModalVisible: false,
        confirmLoading: false
    };

    componentDidMount() {
        window.addEventListener('resize', () => {
            this.setState({
                height: window.innerHeight,
                width: window.innerWidth
            })
        });
    }

    handleSubmit = async params => {
        this.setState({
            inLogin: true
        });

        try {
            let result = await request.post('/login', params);

            if (result.code === 0) {
                // 进行双因子认证
                this.setState({
                    loginAccount: params,
                    totpModalVisible: true
                })
                return;
            }
            if (result.code !== 1) {
                throw new Error(result.message);
            }

            // 跳转登录
            sessionStorage.removeItem('current');
            sessionStorage.removeItem('openKeys');
            localStorage.setItem('X-Auth-Token', result['data']);
            // this.props.history.push();
            window.location.href = "/"
        } catch (e) {
            message.error(e.message);
        } finally {
            this.setState({
                inLogin: false
            });
        }
    };

    handleOk = async (values) => {
        this.setState({
            confirmLoading: true
        })
        let loginAccount = this.state.loginAccount;
        loginAccount['totp'] = values['totp'];
        try {
            let result = await request.post('/loginWithTotp', loginAccount);

            if (result.code !== 1) {
                throw new Error(result.message);
            }

            // 跳转登录
            sessionStorage.removeItem('current');
            sessionStorage.removeItem('openKeys');
            localStorage.setItem('X-Auth-Token', result['data']);
            // this.props.history.push();
            window.location.href = "/"
        } catch (e) {
            message.error(e.message);
        } finally {
            this.setState({
                confirmLoading: false
            });
        }
    }

    handleCancel = () => {
        this.setState({
            totpModalVisible: false
        })
    }

    render() {
        return (
            <div className='login-bg'
                 style={{width: this.state.width, height: this.state.height, backgroundColor: '#F0F2F5'}}>
                <Card className='login-card' title={null}>
                    <div style={{textAlign: "center", margin: '15px auto 30px auto', color: '#1890ff'}}>
                        <Title level={1}>Next Terminal</Title>
                    </div>
                    <Form onFinish={this.handleSubmit} className="login-form">
                        <Form.Item name='username' rules={[{required: true, message: '请输入登录账号！'}]}>
                            <Input prefix={<UserOutlined/>} placeholder="登录账号"/>
                        </Form.Item>
                        <Form.Item name='password' rules={[{required: true, message: '请输入登录密码！'}]}>
                            <Input.Password prefix={<LockOutlined/>} placeholder="登录密码"/>
                        </Form.Item>
                        <Form.Item name='remember' valuePropName='checked' initialValue={false}>
                            <Checkbox>记住登录</Checkbox>
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" className="login-form-button"
                                    loading={this.state.inLogin}>
                                登录
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>

                <Modal title="双因素认证" visible={this.state.totpModalVisible} confirmLoading={this.state.confirmLoading}
                       maskClosable={false}
                       centered={true}
                       onOk={() => {
                           this.formRef.current
                               .validateFields()
                               .then(values => {
                                   this.formRef.current.resetFields();
                                   this.handleOk(values);
                               })
                               .catch(info => {

                               });
                       }}
                       onCancel={this.handleCancel}>

                    <Form ref={this.formRef}>

                        <Form.Item name='totp' rules={[{required: true, message: '请输入双因素认证APP中显示的授权码'}]}>
                            <Input prefix={<OneToOneOutlined/>} placeholder="请输入双因素认证APP中显示的授权码"/>
                        </Form.Item>
                    </Form>
                </Modal>
            </div>

        );
    }
}

export default withRouter(LoginForm);
