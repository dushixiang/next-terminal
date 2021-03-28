import React, {Component} from 'react';
import 'antd/dist/antd.css';
import './App.css';
import {Col, Divider, Dropdown, Layout, Menu, Popconfirm, Row, Tooltip} from "antd";
import {Link, Route, Switch} from "react-router-dom";
import Dashboard from "./components/dashboard/Dashboard";
import Asset from "./components/asset/Asset";
import Access from "./components/access/Access";
import StatusMonitor from "./components/monitor/Monitor";
import User from "./components/user/User";
import OnlineSession from "./components/session/OnlineSession";
import OfflineSession from "./components/session/OfflineSession";
import Login from "./components/Login";
import DynamicCommand from "./components/command/DynamicCommand";
import Credential from "./components/credential/Credential";
import {
    AuditOutlined,
    BlockOutlined,
    CloudServerOutlined,
    CodeOutlined,
    ControlOutlined,
    DashboardOutlined,
    DesktopOutlined,
    DisconnectOutlined,
    DownOutlined,
    GithubOutlined,
    IdcardOutlined,
    LinkOutlined,
    LoginOutlined,
    LogoutOutlined,
    QuestionCircleOutlined,
    SafetyCertificateOutlined,
    SettingOutlined,
    SolutionOutlined,
    TeamOutlined,
    UserOutlined,
    UserSwitchOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
} from '@ant-design/icons';
import Info from "./components/user/Info";
import request from "./common/request";
import {message} from "antd/es";
import Setting from "./components/setting/Setting";
import BatchCommand from "./components/command/BatchCommand";
import {isEmpty, NT_PACKAGE} from "./utils/utils";
import {getCurrentUser, isAdmin} from "./service/permission";
import UserGroup from "./components/user/UserGroup";
import LoginLog from "./components/devops/LoginLog";
import Term from "./components/access/Term";
import Job from "./components/devops/Job";
import {Header} from "antd/es/layout/layout";
import Security from "./components/devops/Security";

const {Footer, Sider} = Layout;

const {SubMenu} = Menu;
const headerHeight = 60;

class App extends Component {

    state = {
        collapsed: false,
        current: sessionStorage.getItem('current'),
        openKeys: sessionStorage.getItem('openKeys') ? JSON.parse(sessionStorage.getItem('openKeys')) : [],
        user: {
            'nickname': '未定义'
        },
        package: NT_PACKAGE(),
        triggerMenu: true
    };

    onCollapse = () => {
        this.setState({
            collapsed: !this.state.collapsed,
        });
    };

    componentDidMount() {
        let hash = window.location.hash;
        let current = hash.replace('#/', '');
        if (isEmpty(current)) {
            current = 'dashboard';
        }
        this.setCurrent(current);
        this.getInfo();
    }

    async getInfo() {

        let result = await request.get('/info');
        if (result['code'] === 1) {
            sessionStorage.setItem('user', JSON.stringify(result['data']));
            this.setState({
                user: result['data'],
                triggerMenu: true
            })
        } else {
            message.error(result['message']);
        }
    }

    updateUser = (user) => {
        this.setState({
            user: user
        })
    }

    setCurrent = (key) => {
        this.setState({
            current: key
        })
        sessionStorage.setItem('current', key);
    }

    subMenuChange = (openKeys) => {
        this.setState({
            openKeys: openKeys
        })
        sessionStorage.setItem('openKeys', JSON.stringify(openKeys));
    }

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
                    <a target='_blank' rel="noreferrer" href='https://github.com/dushixiang/next-terminal'>
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

            <Switch>
                <Route path="/access" component={Access}/>
                <Route path="/term" component={Term}/>
                <Route path="/login"><Login updateUser={this.updateUser}/></Route>

                <Route path="/">
                    <Layout className="layout" style={{minHeight: '100vh'}}>

                        <Sider collapsible collapsed={this.state.collapsed} trigger={null}>
                            <div className="logo">
                                <img src='logo.svg' alt='logo'/>
                                {
                                    !this.state.collapsed ?

                                        <>&nbsp;<h1>Next Terminal</h1></> :
                                        null
                                }
                            </div>

                            <Divider/>

                            <Menu
                                onClick={(e) => this.setCurrent(e.key)}
                                selectedKeys={[this.state.current]}
                                onOpenChange={this.subMenuChange}
                                defaultOpenKeys={this.state.openKeys}
                                theme="dark" mode="inline" defaultSelectedKeys={['dashboard']}
                                inlineCollapsed={this.state.collapsed}
                                style={{lineHeight: '64px'}}>

                                <Menu.Item key="dashboard" icon={<DashboardOutlined/>}>
                                    <Link to={'/'}>
                                        控制面板
                                    </Link>
                                </Menu.Item>

                                <SubMenu key='resource' title='资源管理' icon={<CloudServerOutlined/>}>
                                    <Menu.Item key="asset" icon={<DesktopOutlined/>}>
                                        <Link to={'/asset'}>
                                            资产列表
                                        </Link>
                                    </Menu.Item>
                                    <Menu.Item key="credential" icon={<IdcardOutlined/>}>
                                        <Link to={'/credential'}>
                                            授权凭证
                                        </Link>
                                    </Menu.Item>
                                </SubMenu>

                                <SubMenu key='command-manage' title='指令管理' icon={<CodeOutlined/>}>
                                    <Menu.Item key="dynamic-command" icon={<BlockOutlined/>}>
                                        <Link to={'/dynamic-command'}>
                                            动态指令
                                        </Link>
                                    </Menu.Item>
                                </SubMenu>

                                {
                                    this.state.triggerMenu && isAdmin() ?
                                        <>
                                            <SubMenu key='audit' title='会话审计' icon={<AuditOutlined/>}>
                                                <Menu.Item key="online-session" icon={<LinkOutlined/>}>
                                                    <Link to={'/online-session'}>
                                                        在线会话
                                                    </Link>
                                                </Menu.Item>

                                                <Menu.Item key="offline-session" icon={<DisconnectOutlined/>}>
                                                    <Link to={'/offline-session'}>
                                                        历史会话
                                                    </Link>
                                                </Menu.Item>
                                            </SubMenu>

                                            <SubMenu key='ops' title='系统运维' icon={<ControlOutlined/>}>

                                                <Menu.Item key="login-log" icon={<LoginOutlined/>}>
                                                    <Link to={'/login-log'}>
                                                        登录日志
                                                    </Link>
                                                </Menu.Item>

                                                <Menu.Item key="job" icon={<BlockOutlined/>}>
                                                    <Link to={'/job'}>
                                                        计划任务
                                                    </Link>
                                                </Menu.Item>

                                                <Menu.Item key="access-security" icon={<SafetyCertificateOutlined/>}>
                                                    <Link to={'/access-security'}>
                                                        访问安全
                                                    </Link>
                                                </Menu.Item>
                                            </SubMenu>

                                            <SubMenu key='user-group' title='用户管理' icon={<UserSwitchOutlined/>}>
                                                <Menu.Item key="user" icon={<UserOutlined/>}>
                                                    <Link to={'/user'}>
                                                        用户管理
                                                    </Link>
                                                </Menu.Item>
                                                <Menu.Item key="user-group" icon={<TeamOutlined/>}>
                                                    <Link to={'/user-group'}>
                                                        用户组管理
                                                    </Link>
                                                </Menu.Item>
                                            </SubMenu>

                                        </> : undefined
                                }


                                <Menu.Item key="info" icon={<SolutionOutlined/>}>
                                    <Link to={'/info'}>
                                        个人中心
                                    </Link>
                                </Menu.Item>

                                {
                                    this.state.triggerMenu && isAdmin() ?
                                        <>
                                            <Menu.Item key="setting" icon={<SettingOutlined/>}>
                                                <Link to={'/setting'}>
                                                    系统设置
                                                </Link>
                                            </Menu.Item>
                                        </> : undefined
                                }
                            </Menu>
                        </Sider>

                        <Layout className="site-layout">
                            <Header className="site-layout-background"
                                    style={{padding: 0, height: headerHeight, zIndex: 20}}>
                                <div className='layout-header'>
                                    <Row justify="space-around" align="middle" gutter={24} style={{height: headerHeight}}>
                                        <Col span={4} key={1} style={{height: headerHeight}}>
                                            {React.createElement(this.state.collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                                                className: 'trigger',
                                                onClick: this.onCollapse,
                                            })}
                                        </Col>
                                        <Col span={20} key={2} style={{textAlign: 'right'}}
                                             className={'layout-header-right'}>

                                            <div className={'layout-header-right-item'}>
                                                <Tooltip placement="bottom" title={'使用帮助'}>
                                                    <a target='_blank' rel="noreferrer"
                                                       href='https://github.com/dushixiang/next-terminal/blob/master/docs/faq.md'>
                                                        <QuestionCircleOutlined/>
                                                    </a>
                                                </Tooltip>

                                            </div>


                                            <Dropdown overlay={menu}>
                                                <div className='nickname layout-header-right-item'>
                                                    {getCurrentUser()['nickname']} &nbsp;<DownOutlined/>
                                                </div>
                                            </Dropdown>
                                        </Col>
                                    </Row>

                                </div>
                            </Header>

                            <Route path="/" exact component={Dashboard}/>
                            <Route path="/user" component={User}/>
                            <Route path="/user-group" component={UserGroup}/>
                            <Route path="/asset" component={Asset}/>
                            <Route path="/credential" component={Credential}/>
                            <Route path="/dynamic-command" component={DynamicCommand}/>
                            <Route path="/batch-command" component={BatchCommand}/>
                            <Route path="/online-session" component={OnlineSession}/>
                            <Route path="/offline-session" component={OfflineSession}/>
                            <Route path="/login-log" component={LoginLog}/>
                            <Route path="/info" component={Info}/>
                            <Route path="/setting" component={Setting}/>
                            <Route path="/job" component={Job}/>
                            <Route path="/access-security" component={Security}/>
                            <Route path="/monitor/:id" component={StatusMonitor}/>

                            <Footer style={{textAlign: 'center'}}>
                                Next Terminal ©2021 dushixiang Version:{this.state.package['version']}
                            </Footer>
                        </Layout>

                    </Layout>
                </Route>
            </Switch>

        );
    }
}

export default App;
