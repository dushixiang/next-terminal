import React, {Component} from 'react';
import {Card, Input, List, PageHeader, Popconfirm} from "antd";
import Console from "../access/Console";
import {itemRender} from "../../utils/utils";
import Logout from "../user/Logout";
import './Command.css'

const {Search} = Input;
const routes = [
    {
        path: '',
        breadcrumbName: '首页',
    },
    {
        path: '/dynamic-command',
        breadcrumbName: '动态指令',
    },
    {
        path: '/batch-command',
        breadcrumbName: '批量执行命令',
    }
];

class BatchCommand extends Component {

    commandRef = React.createRef();

    state = {
        webSockets: [],
        assets: [],
        active: undefined,
    }

    componentDidMount() {
        let params = new URLSearchParams(this.props.location.search);
        let command = params.get('command');
        let assets = JSON.parse(params.get('assets'));
        this.setState({
            command: command,
            assets: assets
        })
    }

    onPaneChange = activeKey => {
        this.setState({activeKey});
    };

    appendWebsocket = (webSocket) => {
        this.state.webSockets.push(webSocket);
    }

    render() {
        return (
            <>
                <PageHeader
                    className="site-page-header-ghost-wrapper page-herder"
                    title="批量执行命令"
                    breadcrumb={{
                        routes: routes,
                        itemRender: itemRender
                    }}
                    extra={[
                        <Logout key='logout'/>
                    ]}
                    subTitle="动态指令"
                >
                </PageHeader>

                <div className="page-search">
                    <Search ref={this.commandRef} placeholder="请输入指令" onSearch={value => {
                        for (let i = 0; i < this.state.webSockets.length; i++) {
                            let ws = this.state.webSockets[i]['ws'];
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({
                                    type: 'data',
                                    content: value + String.fromCharCode(13)
                                }));
                            }
                        }
                        this.commandRef.current.setValue('');
                    }} enterButton='执行'/>
                </div>

                <div className="page-card">
                    <List
                        grid={{gutter: 16, column: 2}}
                        dataSource={this.state.assets}
                        renderItem={item => (
                            <List.Item>
                                <Card title={item.name}
                                      className={this.state.active === item['id'] ? 'command-active' : ''}
                                      onClick={() => {
                                          if (this.state.active === item['id']) {
                                              this.setState({
                                                  active: undefined
                                              })
                                          } else {
                                              this.setState({
                                                  active: item['id']
                                              })
                                          }
                                      }}
                                      >
                                    <Console assetId={item.id} command={this.state.command}
                                             width={(window.innerWidth - 350) / 2}
                                             height={420}
                                             appendWebsocket={this.appendWebsocket}/>
                                </Card>
                            </List.Item>
                        )}
                    />
                </div>
            </>
        );
    }
}

export default BatchCommand;