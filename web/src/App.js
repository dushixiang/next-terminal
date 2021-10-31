import React, {Component} from 'react';
import 'antd/dist/antd.css';
import './App.css';
import {Button, Dropdown, Layout, Menu, Popconfirm} from "antd";
import {Link, Route, Switch} from "react-router-dom";
import Dashboard from "./components/dashboard/Dashboard";
import Asset from "./components/asset/Asset";
import Access from "./components/access/Access";
import User from "./components/user/User";
import OnlineSession from "./components/session/OnlineSession";
import OfflineSession from "./components/session/OfflineSession";
import Login from "./components/Login";
import DynamicCommand from "./components/command/DynamicCommand";
import Credential from "./components/credential/Credential";
import {
    ApiOutlined,
    AuditOutlined,
    BlockOutlined,
    CloudServerOutlined,
    CodeOutlined,
    ControlOutlined,
    DashboardOutlined,
    DesktopOutlined,
    DisconnectOutlined,
    DownOutlined,
    FolderOutlined, GithubOutlined,
    HddOutlined,
    IdcardOutlined,
    InsuranceOutlined,
    LinkOutlined,
    LoginOutlined,
    LogoutOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    SafetyCertificateOutlined,
    SettingOutlined,
    SolutionOutlined,
    TeamOutlined,
    UserOutlined,
    UserSwitchOutlined
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
import Storage from "./components/devops/Storage";
import MyFile from "./components/asset/MyFile";
import Strategy from "./components/user/Strategy";
import AccessGateway from "./components/asset/AccessGateway";
import MyAsset from "./components/asset/MyAsset";

const {Footer, Content, Sider} = Layout;

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
                        <SolutionOutlined/> 个人中心
                    </Link>
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
                        <LogoutOutlined/> 退出登录
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

                        {
                            isAdmin() ?
                                <>
                                    <Sider collapsible collapsed={this.state.collapsed} trigger={null}>
                                        <div className="logo">
                                            <img
                                                src='data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iMzIiIGhlaWdodD0iMzIiPjxwYXRoIGQ9Ik0yNzIgMTIyLjI0aDQ4MHYxNTcuMDU2aDk2Vi40NDhoLTk2TDI3MiAwYy01Mi44IDAtOTYgLjQ0OC05NiAuNDQ4djI3OC44NDhoOTZ2LTE1Ny4xMnptNDAzLjY0OCA2MDMuMzkyTDg5NiA1MTIgNjc1LjY0OCAyOTguMzY4IDYwOCAzNjQuNDggNzYwLjEyOCA1MTIgNjA4IDY1OS41Mmw2Ny42NDggNjYuMTEyek00MTYgNjU5LjUyTDI2My44MDggNTEyIDQxNiAzNjQuNDhsLTY3LjcxMi02Ni4xMTJMMTI4IDUxMmwyMjAuMjg4IDIxMy42MzJMNDE2IDY1OS41MnptMzM2IDI0Mi4zMDRIMjcydi0xNTcuMTJoLTk2VjEwMjRoNjcyVjc0NC43MDRoLTk2djE1Ny4xMnoiIGZpbGw9IiNmZmYiLz48L3N2Zz4='
                                                alt='logo'/>
                                            {
                                                !this.state.collapsed ?
                                                    <>&nbsp;<h1>Next Terminal</h1></> :
                                                    null
                                            }
                                        </div>

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
                                                <Menu.Item key="dynamic-command" icon={<CodeOutlined/>}>
                                                    <Link to={'/dynamic-command'}>
                                                        动态指令
                                                    </Link>
                                                </Menu.Item>
                                                <Menu.Item key="access-gateway" icon={<ApiOutlined/>}>
                                                    <Link to={'/access-gateway'}>
                                                        接入网关
                                                    </Link>
                                                </Menu.Item>
                                            </SubMenu>

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
                                                <Menu.Item key="storage" icon={<HddOutlined/>}>
                                                    <Link to={'/storage'}>
                                                        磁盘空间
                                                    </Link>
                                                </Menu.Item>
                                            </SubMenu>

                                            <SubMenu key='user-manage' title='用户管理' icon={<UserSwitchOutlined/>}>
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
                                                <Menu.Item key="strategy" icon={<InsuranceOutlined/>}>
                                                    <Link to={'/strategy'}>
                                                        授权策略
                                                    </Link>
                                                </Menu.Item>
                                            </SubMenu>
                                            <Menu.Item key="my-file" icon={<FolderOutlined/>}>
                                                <Link to={'/my-file'}>
                                                    我的文件
                                                </Link>
                                            </Menu.Item>
                                            <Menu.Item key="info" icon={<SolutionOutlined/>}>
                                                <Link to={'/info'}>
                                                    个人中心
                                                </Link>
                                            </Menu.Item>
                                            <Menu.Item key="setting" icon={<SettingOutlined/>}>
                                                <Link to={'/setting'}>
                                                    系统设置
                                                </Link>
                                            </Menu.Item>
                                        </Menu>
                                    </Sider>

                                    <Layout className="site-layout">
                                        <Header className="site-layout-background"
                                                style={{padding: 0, height: headerHeight, zIndex: 20}}>
                                            <div className='layout-header'>
                                                <div className='layout-header-left'>
                                                    {React.createElement(this.state.collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                                                        className: 'trigger',
                                                        onClick: this.onCollapse,
                                                    })}
                                                </div>

                                                <div className='layout-header-right'>
                                                    <div className={'layout-header-right-item'}>
                                                        <a style={{color: 'black'}} target='_blank' href='https://github.com/dushixiang/next-terminal'>
                                                            <GithubOutlined />
                                                        </a>
                                                    </div>
                                                </div>

                                                <div className='layout-header-right'>
                                                    <Dropdown overlay={menu}>
                                                        <div className='nickname layout-header-right-item'>
                                                            {getCurrentUser()['nickname']} &nbsp;<DownOutlined/>
                                                        </div>
                                                    </Dropdown>
                                                </div>
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
                                        <Route path="/access-gateway" component={AccessGateway}/>
                                        <Route path="/my-file" component={MyFile}/>
                                        <Route path="/storage" component={Storage}/>
                                        <Route path="/strategy" component={Strategy}/>

                                        <Footer style={{textAlign: 'center'}}>
                                            Next Terminal ©2021 dushixiang Version:{this.state.package['version']}
                                        </Footer>
                                    </Layout>
                                </> :
                                <>
                                    <Header style={{padding: 0}}>
                                        <div className='km-header'>
                                            <div style={{flex: '1 1 0%'}}>
                                                <Link to={'/'}>
                                                    <img
                                                        style={{paddingBottom: 4, marginRight: 5}}
                                                        src='data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iMzIiIGhlaWdodD0iMzIiPjxwYXRoIGQ9Ik0yNzIgMTIyLjI0aDQ4MHYxNTcuMDU2aDk2Vi40NDhoLTk2TDI3MiAwYy01Mi44IDAtOTYgLjQ0OC05NiAuNDQ4djI3OC44NDhoOTZ2LTE1Ny4xMnptNDAzLjY0OCA2MDMuMzkyTDg5NiA1MTIgNjc1LjY0OCAyOTguMzY4IDYwOCAzNjQuNDggNzYwLjEyOCA1MTIgNjA4IDY1OS41Mmw2Ny42NDggNjYuMTEyek00MTYgNjU5LjUyTDI2My44MDggNTEyIDQxNiAzNjQuNDhsLTY3LjcxMi02Ni4xMTJMMTI4IDUxMmwyMjAuMjg4IDIxMy42MzJMNDE2IDY1OS41MnptMzM2IDI0Mi4zMDRIMjcydi0xNTcuMTJoLTk2VjEwMjRoNjcyVjc0NC43MDRoLTk2djE1Ny4xMnoiIGZpbGw9IiNmZmYiLz48L3N2Zz4='
                                                        alt='logo'/>
                                                    <span className='km-header-logo'>Next Terminal</span>
                                                </Link>

                                                <Link to={'/my-file'}>
                                                    <Button type="text" style={{color: 'white'}}
                                                            icon={<FolderOutlined/>}>
                                                        文件
                                                    </Button>
                                                </Link>

                                                <Link to={'/dynamic-command'}>
                                                    <Button type="text" style={{color: 'white'}}
                                                            icon={<CodeOutlined/>}>
                                                        指令
                                                    </Button>
                                                </Link>
                                            </div>
                                            <div className='km-header-right'>
                                                <Dropdown overlay={menu}>
                                                <span className={'km-header-right-item'}>
                                                    {getCurrentUser()['nickname']}
                                                </span>
                                                </Dropdown>
                                            </div>
                                        </div>
                                    </Header>
                                    <Content className='km-container'>
                                        <Layout>
                                            <Route path="/" exact component={MyAsset}/>
                                            <Content className={'kd-content'}>
                                                <Route path="/info" component={Info}/>
                                                <Route path="/my-file" component={MyFile}/>
                                                <Route path="/dynamic-command" component={DynamicCommand}/>
                                            </Content>
                                        </Layout>
                                    </Content>
                                    <Footer style={{textAlign: 'center'}}>
                                        Next Terminal ©2021 dushixiang Version:{this.state.package['version']}
                                    </Footer>
                                </>
                        }


                    </Layout>
                </Route>
            </Switch>

        );
    }
}

export default App;
