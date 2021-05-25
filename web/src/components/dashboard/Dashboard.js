import React, {Component} from 'react';
import {Card, Col, Radio, Row, Statistic} from "antd";
import {DesktopOutlined, IdcardOutlined, LinkOutlined, UserOutlined} from '@ant-design/icons';
import request from "../../common/request";
import './Dashboard.css'
import {Link} from "react-router-dom";
import {Area} from '@ant-design/charts';
import {isAdmin} from "../../service/permission";

class Dashboard extends Component {

    state = {
        counter: {},
        d: 'w',
        session: [],
    }

    componentDidMount() {
        this.getCounter();
        this.getD();
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

    getD = async () => {
        let result = await request.get('/overview/sessions?d=' + this.state.d);
        if (result['code'] === 1) {
            this.setState({
                session: result['data']
            })
        }
    }

    handleChangeD = (e) => {
        let d = e.target.value;
        this.setState({
            d: d
        }, () => this.getD())
    }

    handleLinkClick = (e) => {
        if (!isAdmin()) {
            e.preventDefault();
        }
    }

    render() {

        const config = {
            data: this.state.session,
            xField: 'day',
            yField: 'count',
            seriesField: 'protocol',
        };

        const buttonRadio = <Radio.Group value={this.state.d} onChange={this.handleChangeD}>
            <Radio.Button value="w">按周</Radio.Button>
            <Radio.Button value="m">按月</Radio.Button>
        </Radio.Group>

        return (
            <>

                <div style={{margin: 16, marginBottom: 0}}>
                    <Row gutter={16}>
                        <Col span={6}>
                            <Card bordered={true}>
                                <Link to={'/user'} onClick={this.handleLinkClick}>
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
                                <Link to={'/online-session'} onClick={this.handleLinkClick}>
                                    <Statistic title="在线会话" value={this.state.counter['onlineSession']}
                                               prefix={<LinkOutlined/>}/>
                                </Link>
                            </Card>
                        </Col>
                    </Row>
                </div>

                <div className="page-card">
                    <Card title="会话统计" bordered={true} extra={buttonRadio}>
                        <Area {...config} />
                    </Card>

                </div>
            </>
        );
    }
}

export default Dashboard;
