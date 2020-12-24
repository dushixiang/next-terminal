import React, {Component} from 'react';
import {Button, Form, Input, Layout, PageHeader} from "antd";
import {itemRender} from '../../utils/utils'
import request from "../../common/request";
import {message} from "antd/es";

const {Content} = Layout;

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

class Info extends Component {

    state = {}

    passwordFormRef = React.createRef();

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
            message.success('密码修改成功');
        } else {
            message.error(result.message);
        }
    }

    render() {
        return (
            <>
                <PageHeader
                    className="site-page-header-ghost-wrapper page-herder"
                    title="个人中心"
                    breadcrumb={{
                        routes: routes,
                        itemRender: itemRender
                    }}
                    subTitle="个人中心"
                >
                </PageHeader>

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
            </>
        );
    }
}

export default Info;
