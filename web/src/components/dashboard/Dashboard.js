import React, {Component} from 'react';
import {Card, Col, Row, Statistic} from "antd";
import {DesktopOutlined, IdcardOutlined, LinkOutlined, UserOutlined} from '@ant-design/icons';
import request from "../../common/request";
import './Dashboard.css'
import {Link} from "react-router-dom";
import {Bar, Pie} from '@ant-design/charts';

class Dashboard extends Component {

    state = {
        counter: {},
        asset: {
            "ssh": 0,
            "rdp": 0,
            "vnc": 0,
            "telnet": 0,
            "kubernetes": 0,
        },
        access: []
    }

    componentDidMount() {
        this.getCounter();
        this.getAsset();
        this.getAccess();
    }

    componentWillUnmount() {

    }

    getCounter = async () => {
        let result = await request.get('/overview/counter');
        if (result['code'] === 1) {
            this.setState({
                counter: result['data']
            })
        }
    }

    getAsset = async () => {
        let result = await request.get('/overview/asset');
        if (result['code'] === 1) {
            this.setState({
                asset: result['data']
            })
        }
    }

    getAccess = async () => {
        let result = await request.get('/overview/access');
        if (result['code'] === 1) {
            this.setState({
                access: result['data']
            })
        }
    }

    render() {

        const data = [
            {
                type: 'RDP',
                value: this.state.asset['rdp'],
            },
            {
                type: 'SSH',
                value: this.state.asset['ssh'],
            },
            {
                type: 'TELNET',
                value: this.state.asset['telnet'],
            },
            {
                type: 'VNC',
                value: this.state.asset['vnc'],
            },
            {
                type: 'Kubernetes',
                value: this.state.asset['kubernetes'],
            }
        ];
        const config = {
            appendPadding: 10,
            data: data,
            angleField: 'value',
            colorField: 'type',
            radius: 1,
            innerRadius: 0.6,
            label: {
                type: 'inner',
                offset: '-50%',
                content: '{value}',
                style: {
                    textAlign: 'center',
                    fontSize: 14,
                },
            },
            interactions: [{type: 'element-selected'}, {type: 'element-active'}],
            statistic: {
                title: false,
                content: {
                    formatter: () => {
                        return '资产类型';
                    },
                },
            },
        };

        let accessData = this.state.access.map(item=>{
            return {
                title: `${item['username']}@${item['ip']}:${item['port']}`,
                // title: `${item['assetId']}`,
                value: item['accessCount'],
                protocol: item['protocol']
            }
        });

        const accessConfig = {
            data: accessData,
            xField: 'value',
            yField: 'title',
            seriesField: 'protocol',
            legend: { position: 'top-left' },
        }

        return (
            <>

                <div style={{margin: 16, marginBottom: 0}}>
                    <Row gutter={16}>
                        <Col span={6}>
                            <Card bordered={true} hoverable>
                                <Link to={'/user'}>
                                    <Statistic title="在线用户" value={this.state.counter['user']}
                                               prefix={<UserOutlined/>}/>
                                </Link>
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card bordered={true} hoverable>
                                <Link to={'/asset'}>
                                    <Statistic title="资产数量" value={this.state.counter['asset']}
                                               prefix={<DesktopOutlined/>}/>
                                </Link>
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card bordered={true} hoverable>
                                <Link to={'/credential'} hoverable>
                                    <Statistic title="授权凭证" value={this.state.counter['credential']}
                                               prefix={<IdcardOutlined/>}/>
                                </Link>

                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card bordered={true} hoverable>
                                <Link to={'/online-session'}>
                                    <Statistic title="在线会话" value={this.state.counter['onlineSession']}
                                               prefix={<LinkOutlined/>}/>
                                </Link>
                            </Card>
                        </Col>
                    </Row>
                </div>

                <div className="page-card">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Card bordered={true} title="资产类型">
                                <Pie {...config} />
                            </Card>
                        </Col>
                        <Col span={12}>
                            <Card bordered={true} title="使用次数Top10 资产">
                                <Bar {...accessConfig} />
                            </Card>
                        </Col>
                    </Row>

                </div>
            </>
        );
    }
}

export default Dashboard;
