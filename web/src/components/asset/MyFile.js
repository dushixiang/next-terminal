import React, {Component} from 'react';
import StorageFileSystem from "../devops/StorageFileSystem";
import {Col, Descriptions, Layout, Row, Typography,} from "antd";
import {getCurrentUser} from "../../service/permission";
import {FireOutlined, HeartOutlined} from "@ant-design/icons";
import {renderSize} from "../../utils/utils";
import request from "../../common/request";
import {message} from "antd/es";

const {Content} = Layout;
const {Title, Text} = Typography;

class MyFile extends Component {

    state = {
        storage: {}
    }

    componentDidMount() {
        this.getDefaultStorage();
    }

    getDefaultStorage = async () => {
        let result = await request.get(`/storages/${getCurrentUser()['id']}`);
        if (result.code !== 1) {
            message.error(result['message']);
            return;
        }
        this.setState({
            storage: result['data']
        })
    }

    render() {
        let storage = this.state.storage;

        return (
            <div>
                <Content key='page-content' className="site-layout-background page-content">
                    <div style={{marginBottom: 20}}>
                        <Row justify="space-around" align="middle" gutter={24}>
                            <Col span={12} key={1}>
                                <Title level={3}>我的文件</Title>
                            </Col>
                            <Col span={12} key={2} style={{textAlign: 'right'}}>
                                <Descriptions title="" column={2}>
                                    <Descriptions.Item label={<div><FireOutlined/> 大小限制</div>}>
                                        <strong>{storage['limitSize'] < 0 ? '无限制' : renderSize(storage['limitSize'])}</strong>
                                    </Descriptions.Item>
                                    <Descriptions.Item label={<div><HeartOutlined/> 已用大小</div>}>
                                        <strong>{renderSize(storage['usedSize'])}</strong>
                                    </Descriptions.Item>
                                </Descriptions>
                            </Col>
                        </Row>
                    </div>
                    <StorageFileSystem storageId={getCurrentUser()['id']} callback={this.getDefaultStorage}/>
                </Content>
            </div>
        );
    }
}

export default MyFile;