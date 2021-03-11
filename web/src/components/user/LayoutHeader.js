import React, {Component} from 'react';
import {Col, Dropdown, Menu, message, Popconfirm, Row, Tooltip} from "antd";
import request from "../../common/request";
import {getCurrentUser} from "../../service/permission";
import {GithubOutlined, LogoutOutlined, QuestionCircleOutlined, SolutionOutlined} from "@ant-design/icons";
import {Link} from "react-router-dom";

class LayoutHeader extends Component {

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
                    <Link to={'/info'}>
                        <SolutionOutlined/>
                        个人中心
                    </Link>
                </Menu.Item>

                <Menu.Item>
                    <a target='_blank' rel="noreferrer"  href='https://github.com/dushixiang/next-terminal'>
                        <GithubOutlined/>
                        点个Star
                    </a>
                </Menu.Item>

                <Menu.Divider/>

                <Menu.Item>

                    <Popconfirm
                        key='login-btn-pop'
                        title="您确定要退出登录吗?"
                        onConfirm={this.confirm}
                        okText="确定"
                        cancelText="取消"
                        placement="left"
                    >
                        <LogoutOutlined/>
                        退出登录
                    </Popconfirm>
                </Menu.Item>

            </Menu>
        );

        return (
            <div className='layout-header'>
                <Row justify="space-around" align="middle" gutter={24} style={{height: 48}}>
                    <Col span={4} key={1} style={{height: 48}}> </Col>
                    <Col span={20} key={2} style={{textAlign: 'right'}} className={'layout-header-right'}>

                        <div className={'layout-header-right-item'}>
                            <Tooltip placement="bottom" title={'使用帮助'}>
                                <a target='_blank' rel="noreferrer"  href='https://github.com/dushixiang/next-terminal/blob/master/docs/faq.md'>
                                    <QuestionCircleOutlined/>
                                </a>
                            </Tooltip>

                        </div>


                        <Dropdown overlay={menu}>
                            <div className='nickname layout-header-right-item'>{getCurrentUser()['nickname']}</div>
                        </Dropdown>
                    </Col>
                </Row>

            </div>
        );
    }
}

export default LayoutHeader;