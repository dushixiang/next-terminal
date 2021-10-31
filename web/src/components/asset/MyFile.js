import React, {Component} from 'react';
import FileSystem from "../devops/FileSystem";
import {Col, Descriptions, Layout, Row, Typography,} from "antd";
import {getCurrentUser, isAdmin} from "../../service/permission";
import {FireOutlined, HeartOutlined} from "@ant-design/icons";
import {renderSize} from "../../utils/utils";
import request from "../../common/request";
import {message} from "antd/es";

const {Content} = Layout;
const {Title} = Typography;

class MyFile extends Component {

    state = {
        storage: {}
    }

    componentDidMount() {
        this.getDefaultStorage();
    }

    getDefaultStorage = async () => {
        let result = await request.get(`/account/storage`);
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
        let contentClassName = isAdmin() ? 'page-content' : 'page-content-user';
        return (
            <div>
                <Content key='page-content' className={["site-layout-background", contentClassName]}>
                    <div style={{marginBottom: 20}}>
                        <Row justify="space-around" align="middle" gutter={24}>
                            <Col span={16} key={1}>
                                <Title level={3}>我的文件</Title>
                            </Col>
                            <Col span={8} key={2} style={{textAlign: 'right'}}>
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
                    <FileSystem storageId={getCurrentUser()['id']}
                                storageType={'storages'}
                                callback={this.getDefaultStorage}
                                upload={true}
                                download={true}
                                delete={true}
                                rename={true}
                                edit={true}
                                minHeight={window.innerHeight - 203}/>
                </Content>
            </div>
        );
    }
}

export default MyFile;