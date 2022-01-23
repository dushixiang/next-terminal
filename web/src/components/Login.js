import React, {Component} from 'react';
import {Button, Card, Checkbox, Form, Input, Modal, Typography} from "antd";
import './Login.css'
import request from "../common/request";
import {message} from "antd/es";
import {withRouter} from "react-router-dom";
import {LockOutlined, OneToOneOutlined, UserOutlined} from '@ant-design/icons';
import Particles from "react-tsparticles";
import Background  from '../images/bg.png'
import {setToken} from "../utils/utils";

const {Title} = Typography;

class LoginForm extends Component {

    formRef = React.createRef();
    totpInputRef = React.createRef();

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

                this.totpInputRef.current.focus();
                return;
            }
            if (result.code !== 1) {
                throw new Error(result.message);
            }

            // 跳转登录
            sessionStorage.removeItem('current');
            sessionStorage.removeItem('openKeys');
            setToken(result['data']);
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

            if (result['code'] !== 1) {
                message.error(result['message']);
                return;
            }

            // 跳转登录
            sessionStorage.removeItem('current');
            sessionStorage.removeItem('openKeys');
            setToken(result['data']);
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
                 style={{width: this.state.width, height: this.state.height}}>
                <Particles
                    id="tsparticles"
                    options={{
                        background: {
                            color: {
                                // value: "#0d47a1",
                            },
                            image: `url(${Background})`,
                            repeat: 'no-repeat',
                            size: '100% 100%'
                        },
                        fpsLimit: 60,
                        interactivity: {
                            events: {
                                onClick: {
                                    enable: true,
                                    mode: "push",
                                },
                                onHover: {
                                    enable: true,
                                    mode: "repulse",
                                },
                                resize: true,
                            },
                            modes: {
                                bubble: {
                                    distance: 400,
                                    duration: 2,
                                    opacity: 0.8,
                                    size: 40,
                                },
                                push: {
                                    quantity: 4,
                                },
                                repulse: {
                                    distance: 200,
                                    duration: 0.4,
                                },
                            },
                        },
                        particles: {
                            color: {
                                value: "#ffffff",
                            },
                            links: {
                                color: "#ffffff",
                                distance: 150,
                                enable: true,
                                opacity: 0.5,
                                width: 1,
                            },
                            collisions: {
                                enable: true,
                            },
                            move: {
                                direction: "none",
                                enable: true,
                                outMode: "bounce",
                                random: false,
                                speed: 6,
                                straight: false,
                            },
                            number: {
                                density: {
                                    enable: true,
                                    value_area: 800,
                                },
                                value: 80,
                            },
                            opacity: {
                                value: 0.5,
                            },
                            shape: {
                                type: "circle",
                            },
                            size: {
                                random: true,
                                value: 5,
                            },
                        },
                        detectRetina: true,
                    }}
                />
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

                       okButtonProps={{form:'totp-form', key: 'submit', htmlType: 'submit'}}
                       onOk={() => {
                           this.formRef.current
                               .validateFields()
                               .then(values => {
                                   this.handleOk(values);
                                   // this.formRef.current.resetFields();
                               });
                       }}
                       onCancel={this.handleCancel}>

                    <Form id='totp-form' ref={this.formRef}>

                        <Form.Item name='totp' rules={[{required: true, message: '请输入双因素认证APP中显示的授权码'}]}>
                            <Input ref={this.totpInputRef} prefix={<OneToOneOutlined/>} placeholder="请输入双因素认证APP中显示的授权码"/>
                        </Form.Item>
                    </Form>
                </Modal>
            </div>

        );
    }
}

export default withRouter(LoginForm);
