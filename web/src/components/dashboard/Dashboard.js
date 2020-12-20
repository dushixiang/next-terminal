import React, {Component} from 'react';
import {Layout, PageHeader, Card, Row, Col, Progress, Typography, Popover, Statistic} from "antd";
import {DesktopOutlined, IdcardOutlined, LikeOutlined, LinkOutlined, UserOutlined} from '@ant-design/icons';
import {itemRender} from '../../utils/utils'
import request from "../../common/request";
import './Dashboard.css'
import {Link} from "react-router-dom";

const {Content} = Layout;
const {Title, Paragraph} = Typography;


const routes = [
    {
        path: '',
        breadcrumbName: '首页',
    },
    {
        path: 'dashboard',
        breadcrumbName: '仪表盘',
    }
];

class Dashboard extends Component {

    state = {
        status: {
            load: {
                load1: 0,
                load5: 0,
                load15: 0,
            },
            cpu: {
                percent: 0,
                logicalCount: 0,
                physicalCount: 0
            },
            memory: {
                usedPercent: 0,
                available: 0,
                total: 0,
                used: 0
            }
        },
        interval: null,
        counter: {}
    }

    componentDidMount() {
        this.getCounter();
        this.getStatus();

        this.setState({
            interval: setInterval(() => this.getStatus(), 5000)
        })
    }

    componentWillUnmount() {
        if (this.state.interval != null) {
            clearInterval(this.state.interval);
        }
    }

    getStatus = async () => {
        let result = await request.get('/overview/status');
        if (result.code === 1) {
            this.setState({
                status: result.data
            })
        }
    }

    getCounter = async () => {
        let result = await request.get('/overview/counter');
        if (result.code === 1) {
            this.setState({
                counter: result.data
            })
        }
    }

    render() {

        const loadContent = (
            <div>
                <p>最近1分钟负载：{this.state.status.load['load1'].toFixed(1)}</p>
                <p>最近5分钟负载：{this.state.status.load['load5'].toFixed(1)}</p>
                <p>最近15分钟负载：{this.state.status.load['load15'].toFixed(1)}</p>
            </div>
        );

        const cpuContent = (
            <div>
                <p>CPU型号：{this.state.status.cpu['modelName']}</p>
                <p>物理核心：{this.state.status.cpu['physicalCount']}</p>
                <p>逻辑核心：{this.state.status.cpu['logicalCount']}</p>
            </div>
        );

        return (
            <>
                <PageHeader
                    className="site-page-header-ghost-wrapper page-herder"
                    title="dashboard"
                    breadcrumb={{
                        routes: routes,
                        itemRender: itemRender
                    }}
                    subTitle="仪表盘"
                >
                </PageHeader>

                <div className="page-card">

                    <Row gutter={16}>
                        <Col span={6}>
                            <Card bordered={true}>
                                <Link to={'/user'}>
                                    <Statistic title="在线用户" value={this.state.counter['user']}
                                               prefix={<UserOutlined/>}/>
                                </Link>
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card bordered={true}>
                                <Link to={'/asset'}>
                                    <Statistic title="存活资产" value={this.state.counter['asset']}
                                               prefix={<DesktopOutlined/>}/>
                                </Link>
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card bordered={true}>
                                <Link to={'/credential'}>
                                    <Statistic title="授权凭证" value={this.state.counter['credential']}
                                               prefix={<IdcardOutlined/>}/>
                                </Link>

                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card bordered={true}>
                                <Link to={'/online-session'}>
                                    <Statistic title="在线会话" value={this.state.counter['onlineSession']}
                                               prefix={<LinkOutlined/>}/>
                                </Link>
                            </Card>
                        </Col>
                    </Row>
                </div>

                <div className="page-card">
                    <Card title="状态" bordered={true}>
                        <Row>
                            <Col span={4}>
                                <Title level={5} className="text-center">负载状态</Title>
                                <Popover placement="topLeft" title={"负载详情"} content={loadContent}>
                                    <Progress type="circle" width={100}
                                              percent={this.state.status.load['load1'].toFixed(1)}/>
                                </Popover>

                                <Paragraph className="text-center">运行流畅</Paragraph>
                            </Col>
                            <Col span={4}>
                                <Title level={5} className="text-center">CPU使用率</Title>
                                <Popover placement="topLeft" title={"CPU详情"} content={cpuContent}>
                                    <Progress type="circle" width={100}
                                              percent={this.state.status.cpu['percent'].toFixed(1)}/>
                                </Popover>
                                <Paragraph className="text-center">{this.state.status.cpu['logicalCount']}核心</Paragraph>
                            </Col>
                            <Col span={4}>
                                <Title level={5} className="text-center">内存使用率</Title>
                                <Progress type="circle" width={100}
                                          percent={this.state.status.memory['usedPercent'].toFixed(1)}/>

                                <Paragraph className="text-center">
                                    {Math.floor(this.state.status.memory['used'] / 1024 / 1024)}
                                    /
                                    {Math.floor(this.state.status.memory['total'] / 1024 / 1024)}
                                    (MB)
                                </Paragraph>
                            </Col>
                            <Col span={4}>

                            </Col>
                        </Row>
                    </Card>

                </div>
            </>
        );
    }
}

export default Dashboard;
