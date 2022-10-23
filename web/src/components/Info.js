import React, {useState} from 'react';
import {Button, Form, Input, Layout, message, Tabs, Typography} from "antd";
import accountApi from "../api/account";
import Totp from "./Totp";

const {Content} = Layout;
const {Title} = Typography;

const Info = () => {

    let [newPassword1, setNewPassword1] = useState('');
    let [newPassword2, setNewPassword2] = useState('');
    let [newPasswordStatus, setNewPasswordStatus] = useState({});

    const onNewPasswordChange = (value) => {
        setNewPassword1(value.target.value);
        setNewPasswordStatus(validateNewPassword(value.target.value, newPassword2));
    }

    const onNewPassword2Change = (value) => {
        setNewPassword2(value.target.value);
        setNewPasswordStatus(validateNewPassword(newPassword1, value.target.value));
    }

    const validateNewPassword = (newPassword1, newPassword2) => {
        if (newPassword2 === newPassword1) {
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

    const changePassword = async (values) => {
        let success = await accountApi.changePassword(values);
        if (success) {
            message.success('密码修改成功，即将跳转至登录页面');
            window.location.href = '/#';
        }
    }

    return (
        <>
            <Content className={'page-container-white'}>
                <Tabs className={'info-tab'} tabPosition={'left'} tabBarStyle={{width: 150}}>
                    <Tabs.TabPane tab="修改密码" key="change-password">
                        <Title level={4}>修改密码</Title>
                        <div style={{margin: 16}}></div>
                        <Form name="password" onFinish={changePassword}>
                            <input type='password' hidden={true} autoComplete='new-password'/>
                            <Form.Item
                                name="oldPassword"
                                label="原始密码"
                                rules={[
                                    {
                                        required: true,
                                        message: '原始密码',
                                    },
                                ]}
                            >
                                <Input type='password' placeholder="请输入原始密码" style={{width: 240}}/>
                            </Form.Item>
                            <Form.Item
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
                                       onChange={(value) => onNewPasswordChange(value)} style={{width: 240}}/>
                            </Form.Item>
                            <Form.Item
                                name="newPassword2"
                                label="确认密码"
                                rules={[
                                    {
                                        required: true,
                                        message: '请和上面输入新的密码保持一致',
                                    },
                                ]}
                                validateStatus={newPasswordStatus.validateStatus}
                                help={newPasswordStatus.errorMsg || ' '}
                            >
                                <Input type='password' placeholder="请和上面输入新的密码保持一致"
                                       onChange={(value) => onNewPassword2Change(value)} style={{width: 240}}/>
                            </Form.Item>
                            <Form.Item>
                                <Button disabled={newPasswordStatus.errorMsg || !newPasswordStatus.validateStatus}
                                        type="primary"
                                        htmlType="submit">
                                    提交
                                </Button>
                            </Form.Item>
                        </Form>
                    </Tabs.TabPane>

                    {/*<Tabs.TabPane tab="授权令牌" key="token">*/}
                    {/*    <AccessToken/>*/}
                    {/*</Tabs.TabPane>*/}

                    <Tabs.TabPane tab="两步认证" key="totp">
                        <Totp/>
                    </Tabs.TabPane>
                </Tabs>
            </Content>
        </>
    );
}

export default Info;
