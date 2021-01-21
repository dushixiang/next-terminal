import React, {Component} from 'react';
import {Button, Dropdown, Menu, message, Popconfirm} from "antd";
import request from "../../common/request";
import {getCurrentUser} from "../../service/permission";

class Logout extends Component {

    confirm = async (e) => {
        let result = await request.post('/logout');
        if (result['code'] !== 1) {
            message.error(result['message']);
        } else {
            message.success('退出登录成功，即将跳转至登录页面。');
            window.location.reload();
        }
    }


    render() {

        const menu = (
            <Menu>

                <Menu.Item>

                    <Popconfirm
                        key='login-btn-pop'
                        title="您确定要退出登录吗?"
                        onConfirm={this.confirm}
                        okText="确定"
                        cancelText="取消"
                        placement="left"
                    >
                        退出登录
                    </Popconfirm>
                </Menu.Item>

            </Menu>
        );

        return (
            <div>
                <Dropdown overlay={menu}>
                    <Button key="login-btn" type="dashed">
                        {getCurrentUser()['nickname']}
                    </Button>
                </Dropdown>
            </div>
        );
    }
}

export default Logout;