import React, {Component} from 'react';
import {Col, Descriptions, Progress, Row} from "antd";
import request from "../../common/request";
import {renderSize} from "../../utils/utils";
import './Stats.css'

class Stats extends Component {

    state = {
        sessionId: undefined,
        stats: {
            uptime: 0,
            load1: 0,
            load5: 0,
            load10: 0,
            memTotal: 0,
            memFree: 0,
            memAvailable: 0,
            memBuffers: 0,
            memCached: 0,
            swapTotal: 0,
            swapFree: 0,
            network: {},
            fileSystems: [],
            cpu: {
                user: 0,
                system: 0,
                nice: 0,
                idle: 0,
                ioWait: 0,
                irq: 0,
                softIrq: 0,
                guest: 0
            }
        },
        prevStats: {},
        interval: undefined
    }

    componentDidMount() {
        this.props.onRef(this);
        let sessionId = this.props.sessionId;
        this.setState({
            sessionId: sessionId
        }, () => {
            this.getStats();
        });
        this.addInterval();
    }

    getStats = async () => {
        let result = await request.get(`/sessions/${this.state.sessionId}/stats`);
        if (result['code'] !== 1) {
            return
        }
        let data = result['data'];
        this.setState({
            stats: data,
            prevStats: this.state.stats
        });
    }

    addInterval = () => {
        let interval = setInterval(this.getStats, 5000);
        this.setState({
            interval: interval
        });
    }

    delInterval = () => {
        if (this.state.interval) {
            clearInterval(this.state.interval);
            this.setState({
                interval: undefined
            })
        }
    }

    render() {
        const upDays = parseInt((this.state.stats.uptime / 1000 / 60 / 60 / 24).toString());
        const memUsage = ((this.state.stats.memTotal - this.state.stats.memAvailable) * 100 / this.state.stats.memTotal).toFixed(2);
        let network = this.state.stats.network;
        let fileSystems = this.state.stats.fileSystems;

        let swapUsage = 0;
        if (this.state.stats.swapTotal !== 0) {
            swapUsage = ((this.state.stats.swapTotal - this.state.stats.swapFree) * 100 / this.state.stats.swapTotal).toFixed(2)
        }

        return (
            <div>
                <Descriptions title="系统信息" column={4}>
                    <Descriptions.Item label="主机名称">{this.state.stats.hostname}</Descriptions.Item>
                    <Descriptions.Item label="运行时长">{upDays}天</Descriptions.Item>
                </Descriptions>

                <Row justify="center" align="middle">
                    <Col>
                        <Descriptions title="负载" column={4}>
                            <Descriptions.Item label='Load1'>
                                <div className='description-content'>
                                    <Progress percent={this.state.stats.load1} steps={20} size={'small'}/>
                                </div>

                            </Descriptions.Item>
                            <Descriptions.Item label='Load5'>
                                <div className='description-content'>
                                    <Progress percent={this.state.stats.load5} steps={20} size={'small'}/>
                                </div>
                            </Descriptions.Item>
                            <Descriptions.Item label='Load10'>
                                <div className='description-content'>
                                    <Progress percent={this.state.stats.load10} steps={20} size={'small'}/>
                                </div>
                            </Descriptions.Item>
                        </Descriptions>
                    </Col>
                </Row>


                <Descriptions title="CPU" column={4}>
                    <Descriptions.Item label="用户">
                        {this.state.stats.cpu['user'].toFixed(2)}%
                    </Descriptions.Item>
                    <Descriptions.Item label="系统">
                        {this.state.stats.cpu['system'].toFixed(2)}%
                    </Descriptions.Item>
                    <Descriptions.Item label="空闲">
                        {this.state.stats.cpu['idle'].toFixed(2)}%
                    </Descriptions.Item>
                    <Descriptions.Item label="IO等待">
                        {this.state.stats.cpu['ioWait'].toFixed(2)}%
                    </Descriptions.Item>
                    <Descriptions.Item label="硬中断">
                        {this.state.stats.cpu['irq'].toFixed(2)}%
                    </Descriptions.Item>
                    <Descriptions.Item label="软中断">
                        {this.state.stats.cpu['softIrq'].toFixed(2)}%
                    </Descriptions.Item>
                    <Descriptions.Item label="nice">
                        {this.state.stats.cpu['nice'].toFixed(2)}%
                    </Descriptions.Item>
                    <Descriptions.Item label="guest">
                        {this.state.stats.cpu['guest'].toFixed(2)}%
                    </Descriptions.Item>
                </Descriptions>

                <Descriptions title="内存" column={4}>
                    <Descriptions.Item label="物理内存大小">{renderSize(this.state.stats.memTotal)}</Descriptions.Item>
                    <Descriptions.Item label="剩余内存大小">{renderSize(this.state.stats.memFree)}</Descriptions.Item>
                    <Descriptions.Item label="可用内存大小">{renderSize(this.state.stats.memAvailable)}</Descriptions.Item>
                    <Descriptions.Item label="使用占比">
                        <div className='description-content'>
                            <Progress percent={memUsage} steps={20} size={'small'}/>
                        </div>
                    </Descriptions.Item>
                    <Descriptions.Item
                        label="Buffers/Cached">{renderSize(this.state.stats.memBuffers)} / {renderSize(this.state.stats.memCached)}</Descriptions.Item>
                    <Descriptions.Item
                        label="交换内存大小">{renderSize(this.state.stats.swapTotal)}</Descriptions.Item>
                    <Descriptions.Item
                        label="交换内存剩余">{renderSize(this.state.stats.swapFree)}</Descriptions.Item>
                    <Descriptions.Item label="使用占比">
                        <div className='description-content'>
                            <Progress percent={swapUsage} steps={20} size={'small'}/>
                        </div>
                    </Descriptions.Item>
                </Descriptions>

                <Descriptions title="磁盘" column={4}>
                    {
                        fileSystems.map((item, index) => {
                            return (
                                <React.Fragment key={'磁盘' + index}>
                                    <Descriptions.Item label="挂载路径" key={'挂载路径' + index}>
                                        {item['mountPoint']}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="已经使用" key={'已经使用' + index}>
                                        {renderSize(item['used'])}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="剩余空间" key={'剩余空间' + index}>
                                        {renderSize(item['free'])}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="使用占比" key={'使用占比' + index}>
                                        <div className='description-content'>
                                            <Progress
                                                percent={(item['used'] * 100 / (item['used'] + item['free'])).toFixed(2)}
                                                steps={20} size={'small'}/>
                                        </div>
                                    </Descriptions.Item>
                                </React.Fragment>
                            );
                        })
                    }
                </Descriptions>

                <Descriptions title="网络" column={4}>
                    {
                        Object.keys(network).map((key, index) => {
                            let prevNetwork = this.state.prevStats.network;
                            let rxOfSeconds = 0, txOfSeconds = 0;
                            if (prevNetwork[key] !== undefined) {
                                rxOfSeconds = (network[key]['rx'] - prevNetwork[key]['rx']) / 5;
                            }
                            if (prevNetwork[key] !== undefined) {
                                txOfSeconds = (network[key]['tx'] - prevNetwork[key]['tx']) / 5;
                            }

                            return (
                                <React.Fragment key={'网络' + index}>
                                    <Descriptions.Item label="网卡" key={'网卡' + index}>{key}</Descriptions.Item>
                                    <Descriptions.Item label="IPv4" key={'IPv4' + index}>
                                        {network[key]['ipv4']}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="接收" key={'接收' + index}>
                                        {renderSize(network[key]['rx'])} &nbsp; {renderSize(rxOfSeconds)}/秒
                                    </Descriptions.Item>
                                    <Descriptions.Item label="发送" key={'发送' + index}>
                                        {renderSize(network[key]['tx'])} &nbsp; {renderSize(txOfSeconds)}/秒
                                    </Descriptions.Item>
                                </React.Fragment>
                            );
                        })
                    }
                </Descriptions>
            </div>
        );
    }

}

export default Stats;