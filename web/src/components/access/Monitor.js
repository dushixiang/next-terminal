import React, {Component} from 'react';
import Guacamole from 'guacamole-common-js';
import {message, Modal} from 'antd'
import qs from "qs";
import {prefix, wsServer} from "../../common/constants";
import {getToken} from "../../utils/utils";
import './Access.css'

const STATE_IDLE = 0;
const STATE_CONNECTING = 1;
const STATE_WAITING = 2;
const STATE_CONNECTED = 3;
const STATE_DISCONNECTING = 4;
const STATE_DISCONNECTED = 5;

class Access extends Component {

    formRef = React.createRef()

    state = {
        client: {},
        containerOverflow: 'hidden',
        containerWidth: 0,
        containerHeight: 0,
        rate: 1
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
            containerWidth: width * rate,
            containerHeight: height * rate,
            rate: rate,
        })
        this.renderDisplay(connectionId);

        window.addEventListener('resize', this.onWindowResize);
        window.addEventListener('onfocus', this.onWindowFocus);
    }

    componentWillUnmount() {
        if (this.state.client) {
            this.state.client.disconnect();
        }

        window.removeEventListener('resize', this.onWindowResize);
        document.removeEventListener("onfocus", this.onWindowFocus);
    }

    onTunnelStateChange = (state) => {
        console.log('onTunnelStateChange', state);
    };

    onClientStateChange = (state) => {
        switch (state) {
            case STATE_IDLE:
                console.log('初始化');
                message.destroy();
                message.loading('正在初始化中...', 0);
                break;
            case STATE_CONNECTING:
                console.log('正在连接...');
                message.destroy();
                message.loading('正在努力连接中...', 0);
                break;
            case STATE_WAITING:
                console.log('正在等待...');
                message.destroy();
                message.loading('正在等待服务器响应...', 0);
                break;
            case STATE_CONNECTED:
                console.log('连接成功。');
                message.destroy();
                message.success('连接成功');
                if (this.state.client) {
                    this.state.client.getDisplay().scale(this.state.rate);
                }
                break;
            case STATE_DISCONNECTING:
                console.log('连接正在关闭中...');
                message.destroy();
                break;
            case STATE_DISCONNECTED:
                console.log('连接关闭。');
                message.destroy();
                break;
            default:
                break;
        }
    };

    onError = (status) => {

        console.log('通道异常。', status);

        switch (status.code) {
            case 256:
                this.showMessage('未支持的访问');
                break;
            case 512:
                this.showMessage('远程服务异常');
                break;
            case 513:
                this.showMessage('服务器忙碌');
                break;
            case 514:
                this.showMessage('服务器连接超时');
                break;
            case 515:
                this.showMessage('远程服务异常');
                break;
            case 516:
                this.showMessage('资源未找到');
                break;
            case 517:
                this.showMessage('资源冲突');
                break;
            case 518:
                this.showMessage('资源已关闭');
                break;
            case 519:
                this.showMessage('远程服务未找到');
                break;
            case 520:
                this.showMessage('远程服务不可用');
                break;
            case 521:
                this.showMessage('会话冲突');
                break;
            case 522:
                this.showMessage('会话连接超时');
                break;
            case 523:
                this.showMessage('会话已关闭');
                break;
            case 768:
                this.showMessage('网络不可达');
                break;
            case 769:
                this.showMessage('服务器密码验证失败');
                break;
            case 771:
                this.showMessage('客户端被禁止');
                break;
            case 776:
                this.showMessage('客户端连接超时');
                break;
            case 781:
                this.showMessage('客户端异常');
                break;
            case 783:
                this.showMessage('错误的请求类型');
                break;
            case 797:
                this.showMessage('客户端连接数量过多');
                break;
            default:
                this.showMessage('未知错误。');
        }
    };

    showMessage(message) {
        Modal.error({
            title: '提示',
            content: message,
        });
    }

    async renderDisplay(connectionId, protocol) {

        let tunnel = new Guacamole.WebSocketTunnel(wsServer + prefix + '/tunnel');

        tunnel.onstatechange = this.onTunnelStateChange;
        let client = new Guacamole.Client(tunnel);

        // 处理客户端的状态变化事件
        client.onstatechange = this.onClientStateChange;
        client.onerror = this.onError;
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
            <div>
                <div className="container" style={{
                    overflow: this.state.containerOverflow,
                    width: this.state.containerWidth,
                    height: this.state.containerHeight
                }}>

                    <div id="display"/>
                </div>
            </div>
        );
    }
}

export default Access;
