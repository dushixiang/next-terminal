import React, {Component} from 'react';
import Guacamole from 'guacamole-common-js';
import {Modal, Result, Spin} from 'antd'
import qs from "qs";
import {wsServer} from "../../common/constants";
import {getToken} from "../../utils/utils";
import './Access.css'

const STATE_IDLE = 0;
const STATE_CONNECTING = 1;
const STATE_WAITING = 2;
const STATE_CONNECTED = 3;
const STATE_DISCONNECTING = 4;
const STATE_DISCONNECTED = 5;

class Monitor extends Component {

    formRef = React.createRef()

    state = {
        client: {},
        containerOverflow: 'hidden',
        width: 0,
        height: 0,
        rate: 1,
        loading: false,
        tip: '',
        closed: false,
    };

    async componentDidMount() {
        const connectionId = this.props.connectionId;
        let rate = this.props.rate;
        let protocol = this.props.protocol;
        let width = this.props.width;
        let height = this.props.height;

        if (protocol === 'ssh' || protocol === 'telnet') {
            rate = rate * 0.5;
            width = width * 2;
            height = height * 2;
        }
        this.setState({
            width: width * rate,
            height: height * rate,
            rate: rate,
        })
        this.renderDisplay(connectionId);
    }

    componentWillUnmount() {
        if (this.state.client) {
            this.state.client.disconnect();
        }
    }

    onTunnelStateChange = (state) => {
        console.log('onTunnelStateChange', state);
        if (state === Guacamole.Tunnel.State.CLOSED) {
            this.setState({
                loading: false,
                closed: true,
            });
        }
    };

    onClientStateChange = (state) => {
        switch (state) {
            case STATE_IDLE:
                this.setState({
                    loading: true,
                    tip: '正在初始化中...'
                });
                break;
            case STATE_CONNECTING:
                this.setState({
                    loading: true,
                    tip: '正在努力连接中...'
                });
                break;
            case STATE_WAITING:
                this.setState({
                    loading: true,
                    tip: '正在等待服务器响应...'
                });
                break;
            case STATE_CONNECTED:
                this.setState({
                    loading: false
                });
                if (this.state.client) {
                    this.state.client.getDisplay().scale(this.state.rate);
                }
                break;
            case STATE_DISCONNECTING:

                break;
            case STATE_DISCONNECTED:

                break;
            default:
                break;
        }
    };

    showMessage(message) {
        Modal.error({
            title: '提示',
            content: message,
        });
    }

    async renderDisplay(connectionId, protocol) {

        let tunnel = new Guacamole.WebSocketTunnel(wsServer + '/tunnel');

        tunnel.onstatechange = this.onTunnelStateChange;
        let client = new Guacamole.Client(tunnel);

        // 处理客户端的状态变化事件
        client.onstatechange = this.onClientStateChange;
        const display = document.getElementById("display");

        // Add client to display div
        const element = client.getDisplay().getElement();
        display.appendChild(element);

        let token = getToken();

        let params = {
            'connectionId': connectionId,
            'X-Auth-Token': token
        };

        let paramStr = qs.stringify(params);

        // Connect
        client.connect(paramStr);

        // Disconnect on close
        window.onunload = function () {
            client.disconnect();
        };

        this.setState({
            client: client
        })
    }

    render() {

        return (
            <Spin spinning={this.state.loading} tip={this.state.tip}>
                <div>
                    {
                        this.state.closed ?
                            <Result
                                title="远程连接已关闭"
                            /> :
                            <div className="container" style={{
                                overflow: this.state.containerOverflow,
                                width: this.state.width,
                                height: this.state.height
                            }}>

                                <div id="display"/>
                            </div>
                    }


                </div>
            </Spin>
        );
    }
}

export default Monitor;
