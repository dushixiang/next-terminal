import React, {useState} from 'react';
import {Col, Descriptions, Progress, Row} from "antd";
import {renderSize} from "../../utils/utils";
import './Stats.css'
import {useQuery} from "react-query";
import sessionApi from "../../api/session";

const defaultStats = {
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
}

const Stats = ({sessionId, visible, queryInterval = 5000}) => {

    let [stats, setStats] = useState(defaultStats);
    let [prevStats, setPrevStats] = useState({});

    useQuery("stats", () => sessionApi.stats(sessionId), {
        refetchInterval: queryInterval,
        enabled: visible,
        onSuccess: (data) => {
            setPrevStats(stats);
            setStats(data);
        }
    });

    const upDays = parseInt((stats.uptime / 1000 / 60 / 60 / 24).toString());
    const memUsage = ((stats.memTotal - stats.memAvailable) * 100 / stats.memTotal).toFixed(2);
    let network = stats.network;
    let fileSystems = stats.fileSystems;

    let swapUsage = 0;
    if (stats.swapTotal !== 0) {
        swapUsage = ((stats.swapTotal - stats.swapFree) * 100 / stats.swapTotal).toFixed(2)
    }

    return (
        <div>
            <Descriptions title="系统信息" column={4}>
                <Descriptions.Item label="主机名称">{stats.hostname}</Descriptions.Item>
                <Descriptions.Item label="运行时长">{upDays}天</Descriptions.Item>
            </Descriptions>

            <Row justify="center" align="middle">
                <Col>
                    <Descriptions title="负载" column={4}>
                        <Descriptions.Item label='Load1'>
                            <div className='description-content'>
                                <Progress percent={stats.load1} steps={20} size={'small'}/>
                            </div>
                        </Descriptions.Item>
                        <Descriptions.Item label='Load5'>
                            <div className='description-content'>
                                <Progress percent={stats.load5} steps={20} size={'small'}/>
                            </div>
                        </Descriptions.Item>
                        <Descriptions.Item label='Load10'>
                            <div className='description-content'>
                                <Progress percent={stats.load10} steps={20} size={'small'}/>
                            </div>
                        </Descriptions.Item>
                    </Descriptions>
                </Col>
            </Row>


            <Descriptions title="CPU" column={4}>
                <Descriptions.Item label="用户">
                    {stats.cpu['user'].toFixed(2)}%
                </Descriptions.Item>
                <Descriptions.Item label="系统">
                    {stats.cpu['system'].toFixed(2)}%
                </Descriptions.Item>
                <Descriptions.Item label="空闲">
                    {stats.cpu['idle'].toFixed(2)}%
                </Descriptions.Item>
                <Descriptions.Item label="IO等待">
                    {stats.cpu['ioWait'].toFixed(2)}%
                </Descriptions.Item>
                <Descriptions.Item label="硬中断">
                    {stats.cpu['irq'].toFixed(2)}%
                </Descriptions.Item>
                <Descriptions.Item label="软中断">
                    {stats.cpu['softIrq'].toFixed(2)}%
                </Descriptions.Item>
                <Descriptions.Item label="nice">
                    {stats.cpu['nice'].toFixed(2)}%
                </Descriptions.Item>
                <Descriptions.Item label="guest">
                    {stats.cpu['guest'].toFixed(2)}%
                </Descriptions.Item>
            </Descriptions>

            <Descriptions title="内存" column={4}>
                <Descriptions.Item label="物理内存大小">{renderSize(stats.memTotal)}</Descriptions.Item>
                <Descriptions.Item label="剩余内存大小">{renderSize(stats.memFree)}</Descriptions.Item>
                <Descriptions.Item label="可用内存大小">{renderSize(stats.memAvailable)}</Descriptions.Item>
                <Descriptions.Item label="使用占比">
                    <div className='description-content'>
                        <Progress percent={memUsage} steps={20} size={'small'}/>
                    </div>
                </Descriptions.Item>
                <Descriptions.Item
                    label="Buffers/Cached">{renderSize(stats.memBuffers)} / {renderSize(stats.memCached)}</Descriptions.Item>
                <Descriptions.Item
                    label="交换内存大小">{renderSize(stats.swapTotal)}</Descriptions.Item>
                <Descriptions.Item
                    label="交换内存剩余">{renderSize(stats.swapFree)}</Descriptions.Item>
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
                        let prevNetwork = prevStats.network;
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
};

export default Stats;