import React, {Component} from 'react';
import './Monitor.css';
import Layout from "antd/lib/layout/layout";
import {Col, Descriptions, Row, Table} from "antd"
import {wsServer} from "../../common/env";
import {getToken} from "../../utils/utils";
import {message} from "antd/es";
import moment from 'moment';
import qs from "qs";
import {SwapOutlined} from "@ant-design/icons";
import {Line, Pie} from '@ant-design/charts';


const {Content} = Layout

// Demo
class StatusMonitor extends Component {

    state = {
        webSocket: undefined,
        memoryInfo: [],
        netWorkInfo: {},
        totalRx: "",
        totalTx: "",
        memory: {},
        cpuInfo: [],
        rx: 0,
        tx: 0,
        tx_speed: 0,
        rx_speed: 0,
        hardware: {root_disk_info: {}}

    }

    constructor(props) {
        super(props)
        this.state.id = props.match.params.id

    }

    componentDidMount() {
        const dataLength = 10

        let param = {
            'X-Auth-Token': getToken()
        }
        let webSocket = new WebSocket(wsServer + '/monitor/' + this.state.id + "?" + qs.stringify(param));
        this.setState({
            webSocket: webSocket
        })
        let pingInterval;
        webSocket.onopen = (e => {
            pingInterval = setInterval(() => {
                webSocket.send("status")
            }, 3000);
        });

        webSocket.onerror = (e) => {
            console.log("err", e)
            message.error("Failed to connect to server.");
        }
        webSocket.onclose = (e) => {
            if (pingInterval) {
                clearInterval(pingInterval);
            }
        }
        let CpuInfo = []

        webSocket.onmessage = (e) => {
            let data = JSON.parse(e.data)
            let baseInfo = data["base_info"]
            let datetime = new Date(data["datetime"])
            let datetimeStr = moment(datetime).format("YYYY-MM-DD HH:mm:ss")
            let singleCpuInfo = {
                "sys": baseInfo['sys_use'],
                "user": baseInfo["user_use"],
                "datetime": datetimeStr
            }
            singleCpuInfo["total"] = singleCpuInfo["sys"] + singleCpuInfo["user"]

            if (this.state.memoryInfo.length < 20) {
                CpuInfo = this.state.memoryInfo
                CpuInfo.push(singleCpuInfo)

            } else {
                CpuInfo = this.state.memoryInfo.slice(1, 20)
                CpuInfo.push(singleCpuInfo)
                this.setState({memoryInfo: CpuInfo})
            }
            let memory = {
                "free": baseInfo["free"],
                "used": baseInfo["used"],
                "cache": baseInfo["cache"]
            }
            this.setState({
                baseInfo: data["base_info"],
                cpuInfo: CpuInfo,
                memory: memory,
                dockerInfo: data["docker"],
                netWorkInfo: data['net_work'],
                upTime: data['base_info']['uptime'],
                onlineUser: data['base_info']["online_user"],
                totalRx: data['net_work']["rx_total"],
                totalTx: data['net_work']["tx_total"],
                rx_speed: data["net_work"]["rx_speed_pre_second"],
                tx_speed: data["net_work"]["tx_speed_pre_second"],
                hardware: data["hardware_info"]
            })
        }
    }


    componentWillUnmount() {
        let webSocket = this.state.webSocket;
        if (webSocket) {
            webSocket.close()
        }
    }

    parseMemory() {
        let ret = []
        let memory = this.state.memory
        Object.keys(memory).forEach(function (key) {
            let data = {value: memory[key] / 1024 | 0, name: key}
            // switch (key) {
            //     case "free":
            //         data["name"] = "空闲"
            //         break
            //     case "used":
            //         data["name"] = "已使用"
            //         break
            //     case "cache":
            //         data["name"] = "缓存"
            // }
            ret.push(data)
        })
        return ret
    }

    parseCpuData() {
        let ret = {
            user: [],
            sys: [],
            total: [],
        }

        this.state.cpuInfo.forEach(function (item) {
            ret.sys.push(item['sys'])
            ret.user.push(item['user'])
            ret.total.push(item['user'] + item['sys'])
        })
        return ret
    }

    AntCpuInfo() {
        let ret = []
        this.state.cpuInfo.forEach(function (data) {
            ["sys", "user"].forEach(function (item) {

                let single = {
                    "name": item,
                    "data": data[item],
                    "datetime": data['datetime']
                }
                if (item === "sys") {
                    single["name"] = "系统"
                } else if (item === "user") {
                    single["name"] = "用户"
                }
                ret.push(single)
            })
            ret.push({
                "name": "总体",
                "data": data["sys"] + data["user"],
                "datetime": data['datetime']
            })

        })
        return ret
    }

    render() {
        let txList = this.state.totalTx.split(" ")
        let rxList = this.state.totalRx.split(" ")
        if (txList.length > 1 && rxList.length > 1) {
            this.state.tx = parseInt(txList[0])
            this.state.rx = parseInt(rxList[0])
        }


        const containerColumns = [
            {
                title: '容器ID',
                dataIndex: 'container_id',
                key: 'container_id',
            },
            {
                title: '容器名称',
                dataIndex: 'container_name',
                key: 'container_name',
            },
            {
                title: 'CPU',
                dataIndex: 'cpu_pre',
                key: 'cpu_pre',
            },
            {
                title: '内存情况',
                dataIndex: 'mem_usage_limit',
                key: 'mem_usage_limit',
            }
        ];
        var CPUInfo = {
            height: 300,
            data: this.AntCpuInfo(),
            xField: 'datetime',
            yField: 'data',
            seriesField: 'name',
            yAxis: {
                maxLimit: 100
            },

            legend: {position: 'top'},
            smooth: true,
            animation: {
                appear: {
                    animation: 'grow-in-x',
                    duration: 5000,
                },
                update: false
            },
        };
        let memory = this.parseMemory()
        var MemInfo = {
            height: 250,
            appendPadding: 10,
            data: [
                {name: "使用", value: memory.length > 1 ? memory[1]["value"] : 0},
                {name: "空闲", value: memory.length > 1 ? memory[0]["value"] : 0},
                {name: "缓存", value: memory.length > 1 ? memory[2]["value"] : 0},
            ],
            angleField: 'value',
            colorField: 'name',
            radius: 1,
            innerRadius: 0.64,
            animation: false,
            label: {
                type: 'inner',
                offset: '-50%',
                content: '{value}',
                style: {
                    textAlign: 'center',
                    fontSize: 14,
                },
            },
            meta: {
                value: {
                    alias: '内存',
                    formatter: v => {
                        return `${v}M`;
                    }
                }
            },
            interactions: [{type: 'element-selected'}, {type: 'element-active'}],
            statistic: {
                title: false,
                content: {
                    style: {
                        whiteSpace: 'pre-wrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    },
                    formatter: function formatter() {
                        return '内存使用';
                    },
                },
            },
        };

        var NetInfo = {
            height: 250,
            appendPadding: 10,
            data: [
                {value: this.state.tx, name: '发送'},
                {value: this.state.rx, name: '接收'},
            ],
            meta: {
                value: {
                    alias: '流量',
                    formatter: v => {
                        return `${v}G`;
                    }
                }
            },

            angleField: 'value',
            colorField: 'name',
            radius: 1,
            innerRadius: 0.64,
            animation: false,
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
                    style: {
                        whiteSpace: 'pre-wrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    },
                    formatter: function formatter() {
                        return '网络';
                    },
                },
            },
        };
        let use = this.state.hardware["root_disk_info"]["used"] / 1024
        let free = this.state.hardware["root_disk_info"]["free"] / 1024
        var DiskInfo = {
            height: 250,
            appendPadding: 10,
            data: [
                {value: (free | 0), name: '空闲'},
                {value: (use | 0), name: '已使用'},
            ],

            meta: {
                value: {
                    alias: '内存',
                    formatter: v => {
                        return `${v}G`;
                    }
                }
            },
            maxLimit: this.state.hardware["root_disk_info"],
            angleField: 'value',
            colorField: 'name',
            radius: 1,
            innerRadius: 0.64,
            animation: false,
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
                    style: {
                        whiteSpace: 'pre-wrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    },
                    formatter: function formatter() {
                        return '磁盘使用';
                    },
                },
            },
        };
        return (
            <>
                <Content style={{padding: 30}}>
                    <Row gutter={5} justify="start">
                        <Col>
                            <Descriptions title="系统信息">
                                <Descriptions.Item label="开机时长">{this.state.upTime}</Descriptions.Item>
                                <Descriptions.Item label="在线用户">{this.state.onlineUser}</Descriptions.Item>
                                <Descriptions.Item label="CPU个数">{this.state.hardware["cpu_count"]}</Descriptions.Item>
                                <Descriptions.Item label="CPU Model">{this.state.hardware["cpu"]}</Descriptions.Item>
                                <Descriptions.Item
                                    label="内存">{this.state.baseInfo == null ? "" : (this.state.baseInfo["total"] / 1024 / 1025).toFixed(1) + "G"}</Descriptions.Item>
                                <Descriptions.Item
                                    label="hostname">{this.state.baseInfo == null ? "" : this.state.baseInfo["host_name"]}</Descriptions.Item>
                            </Descriptions>
                        </Col>

                    </Row>
                    <Row justify="left" gutter={18} style={{padding: 30}}>

                        <Col span={8}>
                            <Pie {...MemInfo}/>
                        </Col>
                        <Col span={8}>
                            <Pie {...NetInfo}/>
                            <div style={{height: 10, textAlign: "center"}}>
                                <SwapOutlined/>
                                <span>当前网速:上传:{(this.state.tx_speed / 1024).toFixed(1)}Kb/s 下载:{(this.state.rx_speed / 1024).toFixed(1)}Kb/s</span>
                            </div>
                        </Col>
                        <Col span={8}>
                            <Pie {...DiskInfo}/>
                            <div style={{height: 10, textAlign: "center"}}>

                                <span>rootFS:{this.state.hardware["root_disk_info"]['fs']} </span>

                                <span>挂载:{this.state.hardware["root_disk_info"]['mount']} </span>
                                <span>已使用:{this.state.hardware["root_disk_info"]["percentage"]} </span>

                            </div>
                        </Col>
                    </Row>
                    <Row justify="center" style={{paddingTop: 18}}>
                        <Col span={20}>
                            <div className="Status">
                                <Line {...CPUInfo} />
                            </div>
                        </Col>

                    </Row>
                    {
                        this.state.dockerInfo != null &&
                        <Table columns={containerColumns}
                               dataSource={this.state.dockerInfo}
                               pagination={false}
                               style={{padding: 30}}/>
                    }

                </Content>

            </>
        );
    }
}

export default StatusMonitor;
