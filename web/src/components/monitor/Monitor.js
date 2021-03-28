import React, {Component} from 'react';
import './Monitor.css';
import ReactEcharts from 'echarts-for-react'


// Demo
class StatusMonitor extends Component {

    state = {
        option: {}
    }

    componentWillMount() {

    }

    render() {
        const option = {
            title: {
                text: 'CPU使用率'
            },
            tooltip: {
                trigger: 'axis'
            },
            legend: {
                data: ['用户', '系统', '总量']
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            toolbox: {
                feature: {
                    saveAsImage: {}
                }
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
            },
            yAxis: {
                type: 'value',
                max:100
            },
            series: [
                {
                    name: '用户',
                    type: 'line',
                    stack: '用户',
                    data: [20, 32, 1, 34, 9, 23, 21]
                },
                {
                    name: '系统',
                    type: 'line',
                    stack: '系统',
                    data: [40, 10, 20, 40, 30, 33, 32]
                },
                {
                    name: '总量',
                    type: 'line',
                    stack: '总量',
                    data: [60, 32, 21, 74, 39, 56, 53]
                }

            ]
        };
        return (
            <>
                <div>
                    基本信息
                </div>
                <div className="Status">
                    <ReactEcharts
                        style={{height: 300, width: 1200}}
                        notMerge={true}
                        lazyUpdate={true}
                        option={option}/>
                </div>
            </>
        );
    }
}

export default StatusMonitor;
