import React, {Component} from 'react';
import 'antd/dist/antd.css';
import './App.css';
import {Divider, Layout} from "antd";
import {Switch, Route, Link} from "react-router-dom";
import {Menu} from 'antd';
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
    DashboardOutlined,
    UserOutlined,
    IdcardOutlined,
    CloudServerOutlined,
    CodeOutlined,
    BlockOutlined,
    AuditOutlined,
    DesktopOutlined,
    DisconnectOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
    SolutionOutlined,
    SettingOutlined, LinkOutlined
} from '@ant-design/icons';
import Info from "./components/user/Info";
import request from "./common/request";
import {message} from "antd/es";
import Setting from "./components/setting/Setting";
import BatchCommand from "./components/command/BatchCommand";

const {Footer, Sider} = Layout;

const {SubMenu} = Menu;

class App extends Component {

    state = {
        collapsed: false,
        current: sessionStorage.getItem('current'),
        openKeys: sessionStorage.getItem('openKeys') ? JSON.parse(sessionStorage.getItem('openKeys')) : [],
        user: {
            'nickname': '未定义'
        }
    };

    toggle = () => {
        this.setState({
            collapsed: !this.state.collapsed,
        });
    };

    componentDidMount() {
        this.getInfo().then(r => {
        });
    }

    async getInfo() {

        if ('/login' === window.location.pathname) {
            return;
        }

        let result = await request.get('/info');
        if (result.code === 1) {
            this.setState({
                user: result.data
            })
        } else {
            message.error(result.message);
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

        console.debug("current open keys");
        console.table(openKeys);

        this.setState({
            openKeys: openKeys
        })
        sessionStorage.setItem('openKeys', JSON.stringify(openKeys));
    }

    render() {


        return (

            <Switch>
                <Route path="/access" component={Access}/>
                <Route path="/login"><Login updateUser={this.updateUser}/></Route>

                <Route path="/">
                    <Layout className="layout" style={{minHeight: '100vh'}}>

                        <Sider trigger={null} collapsible collapsed={this.state.collapsed} style={{width: 256}}>
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
                                    <Menu.Item key="idcard" icon={<IdcardOutlined/>}>
                                        <Link to={'/credential'}>
                                            授权凭证
                                        </Link>
                                    </Menu.Item>

                                    <Menu.Item key="asset" icon={<DesktopOutlined/>}>
                                        <Link to={'/asset'}>
                                            资产列表
                                        </Link>
                                    </Menu.Item>
                                </SubMenu>

                                <SubMenu key='command-manage' title='指令管理' icon={<CodeOutlined/>}>
                                    <Menu.Item key="dynamic-command" icon={<BlockOutlined/>}>
                                        <Link to={'/dynamic-command'}>
                                            动态指令
                                        </Link>
                                    </Menu.Item>
                                    {/*<Menu.Item key="silent-command" icon={<DeploymentUnitOutlined/>}>
                                                <Link to={'/silent-command'}>
                                                    静默指令
                                                </Link>
                                            </Menu.Item>*/}
                                </SubMenu>

                                <SubMenu key='audit' title='操作审计' icon={<AuditOutlined/>}>
                                    <Menu.Item key="online-session" icon={<LinkOutlined />}>
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

                                <Menu.Item key="user" icon={<UserOutlined/>}>
                                    <Link to={'/user'}>
                                        用户管理
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

                            <div>
                                {React.createElement(this.state.collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                                    className: 'trigger',
                                    onClick: this.toggle,
                                })}
                            </div>
                        </Sider>

                        <Layout className="site-layout">
                            {/*<Header className="site-layout-background"
                                        style={{padding: 0, height: 48, lineHeight: 48}}>

                                </Header>*/}

                            <Route path="/" exact component={Dashboard}/>
                            <Route path="/user" component={User}/>
                            <Route path="/asset" component={Asset}/>
                            <Route path="/credential" component={Credential}/>
                            <Route path="/dynamic-command" component={DynamicCommand}/>
                            <Route path="/batch-command" component={BatchCommand}/>
                            <Route path="/online-session" component={OnlineSession}/>
                            <Route path="/offline-session" component={OfflineSession}/>
                            <Route path="/info" component={Info}/>
                            <Route path="/setting" component={Setting}/>

                            <Footer style={{textAlign: 'center'}}>
                                Next Terminal ©2020 Created by 杜世翔
                            </Footer>
                        </Layout>

                    </Layout>
                </Route>
            </Switch>

        );
    }
}

export default App;
